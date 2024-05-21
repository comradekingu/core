import { edgeCatalog } from "~/stores/edgeCatalog";
import { main } from "~/stores/main";
import { renders } from "~/stores/renders";
import { optionObjectToArray, step } from "~/stores/step";
import type { EdgeDimensions } from "~/types/EdgeDimensions";
import type { LegacyComponent } from "~/types/LegacyComponent";
import type { OptionNameAndValue } from "~/types/OptionNameAndValue";
import type { OptionValue } from "~/types/OptionValue";
import type { StepOptions } from "~/types/StepOptions";
import { stores as webStores } from "~web";
import { dmSocketInjectionKey } from "~web/src/composables/useDmSocket";

export default () => {
  const { getSvgMetadata, loadSvgFromString } = useSvgUtils();

  const { getOptionsFromDb } = useLegacyDb();

  const mainStore = main();
  const stepStore = step();
  const rendersStore = renders();
  const userStore = webStores.users();
  const edgeCatalogStore = edgeCatalog();
  const {
    edgeCreator: { services: edgeCreatorServices },
  } = injectLocal(dmSocketInjectionKey)!;

  const loadDimensionsFromSvg = (
    issuenumber: string,
    svgElement: SVGElement,
  ) => {
    stepStore.setDimensions(
      {
        width: parseInt(svgElement.getAttribute("width")!) / 1.5,
        height: parseInt(svgElement.getAttribute("height")!) / 1.5,
      },
      { issuenumbers: [issuenumber] },
    );
  };
  const loadStepsFromSvg = (
    issuenumber: string,
    svgChildNodes: SVGElement[],
  ) => {
    svgChildNodes
      .filter(({ nodeName }) => nodeName === "g")
      .forEach((group, stepNumber) => {
        stepStore.setOptionValues(
          [
            {
              optionName: "component",
              optionValue: group.getAttribute("class")!,
            },
            ...optionObjectToArray(
              JSON.parse(
                group.getElementsByTagName("metadata")[0].textContent!,
              ) as Record<string, OptionValue>,
            ),
          ],
          {
            stepNumber,
            issuenumbers: [issuenumber],
          },
        );
      });
  };

  const setPhotoUrlsFromSvg = (
    issuenumber: string,
    svgChildNodes: SVGElement[],
  ) => {
    for (const photoUrl of getSvgMetadata(svgChildNodes, "photo")) {
      mainStore.photoUrls[issuenumber] = photoUrl;
    }
  };

  const setContributorsFromSvg = (
    issuenumber: string,
    svgChildNodes: SVGElement[],
  ) => {
    for (const contributionType of ["photographer", "designer"]) {
      for (const username of getSvgMetadata(
        svgChildNodes,
        `contributor-${contributionType}`,
      )) {
        mainStore.addContributor({
          issuenumber,
          contributionType:
            contributionType === "designer" ? "createur" : "photographe",
          user: userStore.allUsers!.find((user) => user.username === username)!,
        });
      }
    }
  };

  const loadDimensionsFromApi = (
    issuenumber: string,
    stepData: Record<
      string,
      {
        issuenumber: string;
        stepNumber: number;
        functionName: string;
        options: StepOptions;
      }
    >,
  ) => {
    const defaultDimensions: EdgeDimensions = { width: 15, height: 200 };
    const dimensions = Object.values(stepData).find(
      ({ stepNumber: originalStepNumber, issuenumber: currentIssuenumber }) =>
        issuenumber === currentIssuenumber && originalStepNumber === -1,
    )?.options;

    const dimensionsToLoad = {
      width: dimensions
        ? parseInt(dimensions.Dimension_x as string)
        : defaultDimensions.width,
      height: dimensions
        ? parseInt(dimensions.Dimension_y as string)
        : defaultDimensions.height,
    };
    stepStore.setDimensions(dimensionsToLoad, { issuenumbers: [issuenumber] });
  };
  const loadStepsFromApi = async (
    publicationcode: string,
    issuenumber: string,
    apiSteps: Record<
      string,
      {
        stepNumber: number;
        functionName: string;
        options: StepOptions;
      }
    >,
    calculateBase64: boolean,
    onError: (error: string, stepNumber: number) => void,
  ): Promise<OptionNameAndValue[][]> => {
    const dimensions = stepStore.getFilteredDimensions({
      issuenumbers: [issuenumber],
    });
    if (!dimensions.length) {
      throw new Error("No dimensions");
    }
    const steps: OptionNameAndValue[][] = [];
    let stepNumber = 0;
    for (const {
      stepNumber: originalStepNumber,
      functionName: originalComponentName,
      options: originalOptions,
    } of Object.values(apiSteps).filter(
      ({ stepNumber: originalStepNumber }) => originalStepNumber !== -1,
    )) {
      const { component } = rendersStore.supportedRenders.find(
        (component) => component.originalName === originalComponentName,
      ) ?? { component: null };
      if (component) {
        try {
          stepStore.setOptionValues(
            optionObjectToArray(
              (await getOptionsFromDb(
                publicationcode,
                issuenumber,
                stepNumber,
                {
                  component,
                  options: originalOptions,
                } as LegacyComponent,
                dimensions[0],
                calculateBase64,
              ))!,
            ),
            {
              issuenumbers: [issuenumber],
              stepNumber: stepNumber++,
            },
          );
        } catch (e) {
          onError(
            `Invalid step ${originalStepNumber} (${component}) : ${
              e as string
            }, step will be ignored.`,
            originalStepNumber,
          );
        }
      } else {
        onError(
          `Unrecognized step name : ${originalComponentName}, step will be ignored.`,
          originalStepNumber,
        );
      }
    }
    return steps;
  };
  const setContributorsFromApi = async (
    issuenumber: string,
    edgeId: number,
  ) => {
    const contributors = await edgeCreatorServices.getModelContributors(edgeId);
    for (const { contribution, userId } of contributors) {
      mainStore.addContributor({
        issuenumber,
        contributionType: contribution,
        user: userStore.allUsers!.find((user) => user.id === userId)!,
      });
    }
  };

  const loadModel = async (
    countrycode: string,
    magazinecode: string,
    issuenumber: string,
    targetIssuenumber: string,
  ) => {
    const onlyLoadStepsAndDimensions = issuenumber !== targetIssuenumber;

    const loadSvg = async (publishedVersion: boolean) => {
      const { svgElement, svgChildNodes } = await loadSvgFromString(
        countrycode,
        magazinecode,
        issuenumber,
        new Date().toISOString(),
        publishedVersion,
      );

      loadDimensionsFromSvg(issuenumber, svgElement);
      loadStepsFromSvg(issuenumber, svgChildNodes);
      if (!onlyLoadStepsAndDimensions) {
        setPhotoUrlsFromSvg(issuenumber, svgChildNodes);
        setContributorsFromSvg(issuenumber, svgChildNodes);
      }
    };

    try {
      await loadSvg(false);
    } catch {
      try {
        await loadSvg(true);
      } catch {
        const publicationcode = `${countrycode}/${magazinecode}`;
        const edge = (await edgeCreatorServices.getModel(
          publicationcode,
          issuenumber,
        ))!;
        await edgeCatalogStore.loadPublishedEdgesSteps({
          publicationcode,
          edgeModelIds: [edge.id],
        });
        const apiSteps =
          edgeCatalogStore.publishedEdgesSteps[publicationcode][issuenumber];
        loadDimensionsFromApi(issuenumber, apiSteps);
        await loadStepsFromApi(
          publicationcode,
          issuenumber,
          apiSteps,
          true,
          (error: string) => mainStore.addWarning(error),
        );

        if (!onlyLoadStepsAndDimensions) {
          await setPhotoUrlsFromApi(issuenumber, edge.id);
          await setContributorsFromApi(issuenumber, edge.id);
        }
      }
    }
    if (!stepStore.options.length) {
      throw new Error(`No model found for issue ${issuenumber}`);
    }
  };

  const setPhotoUrlsFromApi = async (issuenumber: string, edgeId: number) => {
    const photo = await edgeCreatorServices.getModelMainPhoto(edgeId);
    mainStore.photoUrls[issuenumber] = photo.fileName;
  };

  return {
    loadDimensionsFromSvg,
    loadStepsFromSvg,
    setPhotoUrlsFromSvg,
    setContributorsFromSvg,
    loadDimensionsFromApi,
    loadStepsFromApi,
    setContributorsFromApi,
    loadModel,
    setPhotoUrlsFromApi,
  };
};
