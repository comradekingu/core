import Vue from 'vue'
import { mapState, mapMutations } from 'vuex'
const interact = require('interactjs')

export default {
  props: {
    issuenumber: { type: String },
    stepNumber: { type: Number },
    svgGroup: { type: Object },
    dbOptions: { type: Object },
  },
  data() {
    return {
      options: {},
    }
  },
  computed: {
    ...mapState(['width', 'height']),
    ...mapState('ui', ['zoom', 'locked']),
    ...mapState('editingStep', {
      editingIssuenumber: 'issuenumber',
      editingStepNumber: 'stepNumber',
      editingStepOptions: 'stepOptions',
    }),
    svgMetadata() {
      return (
        this.svgGroup && JSON.parse(this.svgGroup.getElementsByTagName('metadata')[0].textContent)
      )
    },
    shouldApplyLockedOption() {
      return (
        this.locked &&
        this.editingStepNumber === this.stepNumber &&
        this.editingIssuenumber !== this.issuenumber
      )
    },
    colors() {
      return Object.keys(this.options)
        .filter(
          (optionName) =>
            this.isColorOption(optionName) && this.options[optionName] !== 'transparent'
        )
        .map((optionName) => this.options[optionName])
    },
  },
  watch: {
    editingStepNumber: {
      immediate: true,
      handler(newStepNumber) {
        if (this.isEditingCurrentStep(newStepNumber, this.editingIssuenumber)) {
          this.setStepOptions(this.options)
        }
      },
    },
    editingStepOptions: {
      deep: true,
      handler(newEditingStepOptions, oldEditingStepOptions) {
        if (this.shouldApplyLockedOption) {
          const diffEditingStepOptions = Object.keys(newEditingStepOptions)
            .filter(
              (optionName) =>
                newEditingStepOptions[optionName] !== oldEditingStepOptions[optionName]
            )
            .reduce((obj, key) => ({ ...obj, [key]: newEditingStepOptions[key] }), {})
          console.log(
            `Issuenumber ${this.issuenumber} : Applying locked option changes : ${JSON.stringify(
              diffEditingStepOptions
            )}`
          )
          this.copyOptions({
            ...this.options,
            ...diffEditingStepOptions,
          })
        }
      },
    },
    editingIssuenumber: {
      immediate: true,
      handler(newIssuenumber) {
        if (this.isEditingCurrentStep(this.editingStepNumber, newIssuenumber)) {
          this.setStepOptions(this.options)
        }
      },
    },
    options: {
      deep: true,
      immediate: true,
      handler(newOptions) {
        if (this.isEditingCurrentStep(this.editingStepNumber, this.editingIssuenumber)) {
          this.setStepOptions(newOptions)
        }
      },
    },
    colors: {
      immediate: true,
      handler(newColors) {
        this.setStepColors({ stepNumber: this.stepNumber, colors: newColors })
      },
    },
  },
  methods: {
    isColorOption(optionName) {
      return optionName.toLowerCase().includes('color') || ['fill', 'stroke'].includes(optionName)
    },
    isEditingCurrentStep(editingStepNumber, editingIssuenumber) {
      return editingStepNumber === this.stepNumber && editingIssuenumber === this.issuenumber
    },
    setStepOptions(options) {
      const newOptions = {}
      Object.keys(options).forEach((optionKey) => {
        Vue.set(newOptions, optionKey, options[optionKey])
      })
      this.setEditingStepOptions(newOptions)
    },
    copyOptions(options) {
      const optionsKeys = Object.keys(options)
      const optionsClone = {}
      optionsKeys.forEach((optionName) => {
        Vue.set(optionsClone, optionName, options[optionName])
      })
      this.options = optionsClone
    },
    enableDragResize(image, { onmove = null, onresizemove = null } = {}) {
      const vm = this
      interact(image)
        .draggable({
          onmove:
            onmove ||
            (({ dx, dy }) => {
              vm.options.x += dx / vm.zoom
              vm.options.y += dy / vm.zoom
            }),
        })
        .resizable({
          edges: { right: true, bottom: true },
        })
        .on(
          'resizemove',
          onresizemove ||
            (({ rect }) => {
              vm.options.width = rect.width / vm.zoom
              vm.options.height = rect.height / vm.zoom
            })
        )
    },
    ...mapMutations('editingStep', { setEditingStepOptions: 'setStepOptions' }),
    ...mapMutations(['setStepColors']),
  },
  async mounted() {
    const vm = this
    if (this.svgMetadata) {
      this.copyOptions(this.svgMetadata)
    } else if (this.dbOptions) {
      this.copyOptions(await this.getOptionsFromDb())
    }
    this.onOptionsSet()
    this.$root.$on('set-option', (optionName, optionValue) => {
      if (vm.isEditingCurrentStep(vm.editingStepNumber, vm.editingIssuenumber) || vm.locked) {
        vm.options[optionName] = optionValue
      }
    })
  },
}
