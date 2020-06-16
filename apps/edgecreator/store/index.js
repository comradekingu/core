export const state = () => ({
  edge: null,
  steps: [],
  galleryItems: [],
  zoom: 1.5,
  width: 15,
  height: 200,
  edgesBefore: [],
  edgesAfter: []
})

export const mutations = {
  setEdge(state, edge) {
    state.edge = edge
  },
  setSteps(state, steps) {
    state.steps = steps
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
        `/fs/browseElements/${state.edge.country}/${state.edge.magazine}`
      )
    })
  },
  async loadSurroundingEdges({ state, commit }) {
    const publicationIssues = await this.$axios.$get(
      `/api/coa/list/issues/${state.edge.country}/${state.edge.magazine}`
    )
    const currentIssueIndex = publicationIssues.findIndex(
      (issue) => issue === state.edge.issuenumber
    )
    const issuesBefore = publicationIssues.filter(
      (unused, index) =>
        currentIssueIndex !== -1 &&
        index >= currentIssueIndex - 10 &&
        index < currentIssueIndex
    )
    const issuesAfter = publicationIssues.filter(
      (unused, index) =>
        currentIssueIndex !== -1 &&
        index > currentIssueIndex &&
        index <= currentIssueIndex + 10
    )

    if (issuesBefore.length) {
      commit('setEdgesBefore', {
        edges: await this.$axios.$get(
          `/api/edges/${state.edge.country}/${
            state.edge.magazine
          }/${issuesBefore.join(',')}`
        )
      })
    }

    if (issuesAfter.length) {
      commit('setEdgesAfter', {
        edges: await this.$axios.$get(
          `/api/edges/${state.edge.country}/${
            state.edge.magazine
          }/${issuesAfter.join(',')}`
        )
      })
    }
  }
}
