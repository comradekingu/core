import { mapMutations, mapState } from 'vuex'
import svgUtilsMixin from '@/mixins/svgUtilsMixin'

export default {
  computed: {
    ...mapState('edgeCatalog', ['currentEdges', 'publishedEdges']),
  },
  mixins: [svgUtilsMixin],
  methods: {
    addEdgeFromApi(edge, status) {
      this.addCurrentEdge(
        {
          country: edge.pays,
          magazine: edge.magazine,
          issuenumber: edge.numero,
        },
        status
      )
    },
    addEdgeFromSvg(edge, edgeDesigners) {
      this.addCurrentEdge(
        edge,
        edgeDesigners.length
          ? edgeDesigners.includes(this.$cookies.get('dm-user'))
            ? 'ongoing'
            : 'ongoing_by_other_user'
          : 'pending'
      )
    },
    addCurrentEdge(edge, status) {
      this.setCurrentEdges([
        ...new Set(this.currentEdges).add({
          status,
          ...edge,
        }),
      ])
    },
    getEdgesByStatus(status) {
      return (this.currentEdges || []).filter((edge) => edge.status === status)
    },
    getEdgeStatus(edge) {
      const isPublished = (this.publishedEdges[`${edge.country}/${edge.magazine}`] || []).some(
        (publishedEdge) => publishedEdge.issuenumber === edge.issuenumber
      )

      return (
        this.currentEdges.find(
          (currentEdge) =>
            currentEdge.country === edge.country &&
            currentEdge.magazine === edge.magazine &&
            currentEdge.issuenumber === edge.issuenumber
        ) || { status: isPublished ? 'published' : 'none' }
      ).status
    },
    ...mapMutations('edgeCatalog', ['setCurrentEdges']),
  },
  mounted() {
    if (this.currentEdges !== null) {
      return
    }
    const vm = this
    const apiCalls = [
      { status: 'ongoing', url: '/api/edgecreator/v2/model' },
      { status: 'ongoing_by_other_user', url: '/api/edgecreator/v2/model/editedbyother/all' },
      { status: 'pending', url: '/api/edgecreator/v2/model/unassigned/all' },
    ]
    apiCalls.forEach(({ status, url }) => {
      vm.$axios
        .$get(url)
        .then((data) => {
          data.forEach((edge) => {
            vm.addEdgeFromApi(edge, status)
          })
        })
        .catch((e) => {
          console.error(e)
        })
    })

    this.$axios.$get('/fs/browseCurrentEdges').then((currentEdges) => {
      currentEdges.forEach(async (fileName) => {
        const [, country, magazine, issuenumber] = fileName.match(
          /\/([^/]+)\/gen\/_([^.]+)\.(.+).svg$/
        )
        if ([country, magazine, issuenumber].includes(undefined)) {
          console.error('Invalid SVG file name : ' + fileName)
          return
        }
        const { svgChildNodes } = await this.loadSvgFromString(country, magazine, issuenumber)
        const edgeDesigners = vm.getSvgMetadata(svgChildNodes, 'contributor-designer')

        vm.addEdgeFromSvg({ country, magazine, issuenumber }, edgeDesigners)
      })
    })
  },
}
