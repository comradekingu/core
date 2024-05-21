import type { ModelContributor } from "~types/ModelContributor";

import { edgecreatorSocketInjectionKey } from "./useEdgecreatorSocket";

export default () => {
  const {
    save: { services: saveServices },
  } = injectLocal(edgecreatorSocketInjectionKey)!;

  const removeVueMarkup = (element: HTMLElement) => {
    Object.values(element.attributes || [])
      .filter(
        (attribute) =>
          attribute.name.startsWith("data-v-") ||
          attribute.name === "is-visible",
      )
      .forEach(({ name: attributeName }) =>
        element.removeAttribute(attributeName),
      );
    for (const childNode of Object.values(element.childNodes)) {
      removeVueMarkup(childNode as HTMLElement);
    }
    return element;
  };
  const saveEdgeSvg = async (
    country: string,
    magazine: string,
    issuenumber: string,
    contributors: ModelContributor[],
    withExport = false,
    withSubmit = false,
  ) => {
    const svgElementId = `edge-canvas-${issuenumber}`;
    const cleanSvg = removeVueMarkup(
      document.getElementById(svgElementId)!.cloneNode(true) as HTMLElement,
    );
    return saveServices
      .saveEdge({
        runExport: withExport,
        runSubmit: withSubmit,
        country,
        magazine,
        issuenumber,
        contributors,
        content: cleanSvg.outerHTML,
      })
      .then(({ results }) => results);
  };

  return {
    removeVueMarkup,
    saveEdgeSvg,
  };
};
