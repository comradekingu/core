export const state = () => ({
  country: null,
  magazine: null,
  issuenumbers: [],

  galleryItems: [],
  zoom: 1.5,
  width: 15,
  height: 200,
  edgesBefore: [],
  edgesAfter: []
})

export const mutations = {
  setCountry(state, country) {
    state.country = country
  },
  setMagazine(state, magazine) {
    state.magazine = magazine
  },
  setIssuenumbers(state, issuenumbers) {
    state.issuenumbers = issuenumbers
  },
  addStep(state, step) {
    state.steps.push(step)
  },
  setZoom(state, zoom) {
    state.zoom = zoom
  },
  setDimensions(state, { width, height }) {
    state.width = parseFloat(width)
    state.height = parseFloat(height)
  },
  setEdgesBefore(state, { edges: edgesBefore }) {
    state.edgesBefore = edgesBefore
  },
  setEdgesAfter(state, { edges: edgesAfter }) {
    state.edgesAfter = edgesAfter
  },
  setGalleryItems(state, { items: galleryItems }) {
    state.galleryItems = galleryItems
  }
}

export const actions = {
  async loadGalleryItems({ state, commit }) {
    commit('setGalleryItems', {
      items: await this.$axios.$get(
        `/fs/browseElements/${state.country}/${state.magazine}`
      )
    })
  },
  async loadSurroundingEdges({ state, commit }) {
    const publicationIssues = await this.$axios.$get(
      `/api/coa/list/issues/${state.country}/${state.magazine}`
    )
    const firstIssueIndex = publicationIssues.findIndex(
      (issue) => issue === state.issuenumbers[0]
    )
    const lastIssueIndex = publicationIssues.findIndex(
      (issue) => issue === state.issuenumbers[state.issuenumbers.length - 1]
    )
    const issuesBefore = publicationIssues.filter(
      (unused, index) =>
        firstIssueIndex !== -1 &&
        index >= firstIssueIndex - 10 &&
        index < firstIssueIndex
    )
    const issuesAfter = publicationIssues.filter(
      (unused, index) =>
        lastIssueIndex !== -1 &&
        index > lastIssueIndex &&
        index <= lastIssueIndex + 10
    )

    if (issuesBefore.length) {
      commit('setEdgesBefore', {
        edges: await this.$axios.$get(
          `/api/edges/${state.country}/${state.magazine}/${issuesBefore.join(
            ','
          )}`
        )
      })
    }

    if (issuesAfter.length) {
      commit('setEdgesAfter', {
        edges: await this.$axios.$get(
          `/api/edges/${state.country}/${state.magazine}/${issuesAfter.join(
            ','
          )}`
        )
      })
    }
  }
}
