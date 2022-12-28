import axios from "axios";
import { Handler, Response } from "express";

export type getType = string | number;
export const get: Handler = async (req, res: Response<getType>) => {
  const response = (await axios.get(process.env.PASTEC_HOSTS + "/imageIds"))
    .data;
  if (response) {
    const imageIds = JSON.parse(response)?.image_ids;
    if (imageIds) {
      res.writeHead(200, { "Content-Type": "application/text" });
      res.end(imageIds.length);
    } else {
      res.writeHead(500, { "Content-Type": "application/text" });
      res.end("Pastec /imageIds response is invalid");
    }
  } else {
    res.writeHead(500, { "Content-Type": "application/text" });
    res.end("Pastec is unreachable");
  }
};
