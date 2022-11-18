import { decompressFromBase64 } from "@prisma/client/runtime";
import bodyParser from "body-parser";
import crypto from "crypto";
import { Handler, Request, Response } from "express";

import PresentationSentenceRequested from "~/emails/presentation-sentence-requested";
import { generateAccessToken, isValidEmail } from "~/routes/auth/util";
import { PrismaClient, user } from "~prisma_clients/client_dm";

const parseForm = bodyParser.json();
const prisma = new PrismaClient();

const exclude = <Key extends keyof user>(
  user: user | null,
  ...keys: Key[]
): Omit<user, Key> | null => {
  if (!user) {
    return user;
  }
  for (const key of keys) {
    delete user[key];
  }
  return user;
};

export const getUser = async (req: Request) =>
  await prisma.user.findUnique({
    where: { id: req.user.id },
  });
export const get: Handler = async (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(exclude(await getUser(req), "password")));
};

export const del: Handler = async (req, res) => {
  const { id: userId } = req.user;
  await prisma.issue.deleteMany({
    where: { userId },
  });
  await prisma.authorUser.deleteMany({
    where: { userId },
  });
  await prisma.purchase.deleteMany({
    where: { userId },
  });
  await prisma.userOption.deleteMany({
    where: { userId },
  });
  await prisma.user.delete({
    where: { id: userId },
  });

  res.writeHead(200, { "Content-Type": "application/text" });
  res.end();
};

export const post = [
  parseForm,
  (async (req, res) => {
    let hasRequestedPresentationSentenceUpdate = false;
    const input = req.body;
    let validators = [validateEmail, validatePresentationText];
    if (req.body.newPassword) {
      input.userId = req.user.id;
      input.password = input.newPassword;
      input.password2 = input.newPassword2;
      validators = [
        ...validators,
        validatePasswords,
        validatePasswordUpdate,
        validateOldPassword,
      ];
    }
    if (await validate(input, res, validators)) {
      if (req.body.newPassword) {
        await prisma.user.update({
          data: {
            password: getHashedPassword(input.newPassword),
          },
          where: {
            id: req.user.id,
          },
        });
      }
      const updatedUser = await prisma.user.update({
        data: {
          email: input.email,
          allowSharing: input.allowSharing,
          showPresentationVideo: input.showPresentationVideo,
        },
        where: { id: req.user.id },
      });
      if (updatedUser.presentationText !== input.presentationText) {
        hasRequestedPresentationSentenceUpdate = true;
        await new PresentationSentenceRequested({
          user: updatedUser,
          presentationText: input.presentationText,
        }).send();
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          hasRequestedPresentationSentenceUpdate,
        })
      );
    }
  }) as Handler,
];

const validate = async (
  input: { [key: string]: unknown },
  res: Response,
  validators: ((input: { [key: string]: unknown }) => void)[]
): Promise<boolean> => {
  for (const validator of validators) {
    try {
      await validator(input);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/text" });
      res.end(decompressFromBase64(e as Error).toString());
      return false;
    }
  }
  return true;
};

export const put = [
  parseForm,
  (async (req, res) => {
    const isValid = await validate(req.body, res, [
      validateUsername,
      validateUsernameCreation,
      validateEmail,
      validateEmailCreation,
      validatePasswords,
    ]);
    if (isValid) {
      const { username, password, email } = req.body;
      const hashedPassword = getHashedPassword(password);
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          email,
          signupDate: new Date(),
        },
      });

      const privileges = (
        await prisma.userPermission.findMany({
          where: {
            username,
          },
        })
      ).groupBy("role", "privilege");
      const token = generateAccessToken({
        id: user.id,
        username,
        hashedPassword,
        privileges,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ token }));
    }
  }) as Handler,
];

const validateUsername = ({ username }: { [_: string]: unknown }) => {
  const USERNAME_REGEX = /^[-_A-Za-z0-9]{3,15}$/;
  if (!USERNAME_REGEX.test(username as string)) {
    throw new Error("Invalid username");
  }
};

const validateUsernameCreation = async ({
  username,
}: {
  [_: string]: unknown;
}) => {
  if (await prisma.user.count({ where: { username: username as string } })) {
    throw new Error("This username is already taken");
  }
};

const validateEmailCreation = async ({ email }: { [_: string]: unknown }) => {
  if (await prisma.user.count({ where: { email: email as string } })) {
    throw new Error("This email is already used in another account");
  }
};

const validateEmail = ({ email }: { [_: string]: unknown }) => {
  if (!isValidEmail(email as string)) {
    throw new Error("Invalid email");
  }
};

const validatePasswords = ({
  password,
  password2,
}: {
  [_: string]: unknown;
}) => {
  if ((password as string).length < 6) {
    throw new Error("Your password should be at least 6 characters long");
  } else if (password !== password2) {
    throw new Error("The two passwords should be identical");
  }
};

const validatePasswordUpdate = ({
  oldPassword,
  newPassword,
}: {
  [_: string]: unknown;
}) => {
  if (!oldPassword || !newPassword) {
    throw new Error(
      "Both the old and the new password need to be filled if you want to change your password. If you don't want to change your password, leave both old and new passwords empty."
    );
  }
};

function getHashedPassword(password: string) {
  return crypto.createHash("sha1").update(password).digest("hex");
}

const validateOldPassword = async ({
  userId,
  oldPassword,
}: {
  [_: string]: unknown;
}) => {
  const hashedPassword = getHashedPassword(oldPassword as string);
  if (
    !(await prisma.user.findFirst({
      where: { id: userId as number, password: hashedPassword },
    }))
  ) {
    throw new Error("L'ancien mot de passe est invalide.");
  }
};

const validatePresentationText = ({
  presentationText,
}: {
  [_: string]: unknown | null;
}) => {
  if (!presentationText || String(presentationText).length > 100) {
    throw new Error(
      "The presentation text should be between 1 and 100 characters"
    );
  }
};
