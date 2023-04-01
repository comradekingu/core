import { defineStore } from "pinia";

import { api } from "~/stores/api";
import { GET__global_stats__user__list } from "~dm_types/routes";
import { SimpleUser } from "~types/SimpleUser";

import { call } from "../../axios";

export const users = defineStore("users", {
  state: () => ({
    allUsers: null as SimpleUser[] | null,
  }),

  actions: {
    async fetchAllUsers() {
      if (!this.allUsers) {
        this.allUsers = (
          await call(api().dmApi, new GET__global_stats__user__list())
        ).data;
      }
    },
  },
});
