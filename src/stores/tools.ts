import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { blueskyClient } from '@/services/blueskyClient';
import type {
  ActorSearchResult,
  BskyList,
  CuratedPost,
  ListMember,
  OperationResult,
  StarterPack,
} from '@/types/bluesky';

export const useToolsStore = defineStore('tools', () => {
  const lists = ref<BskyList[]>([]);
  const starterPacks = ref<StarterPack[]>([]);
  const actorSearchResults = ref<ActorSearchResult[]>([]);
  const members = ref<ListMember[]>([]);
  const loading = ref(false);
  const operationResult = ref<OperationResult | null>(null);

  const selectedPosts = ref<CuratedPost[]>([]);
  const moderationMode = ref(false);
  const pendingPosts = ref<CuratedPost[]>([]);

  const selectedMemberCount = computed(() => members.value.length);

  async function refreshLists() {
    loading.value = true;
    try {
      lists.value = await blueskyClient.getViewerLists();
    } finally {
      loading.value = false;
    }
  }

  async function loadListMembers(listUri: string) {
    loading.value = true;
    try {
      members.value = await blueskyClient.getListMembers(listUri);
    } finally {
      loading.value = false;
    }
  }

  async function refreshStarterPacks() {
    loading.value = true;
    try {
      starterPacks.value = await blueskyClient.getViewerStarterPacks();
    } finally {
      loading.value = false;
    }
  }

  async function loadStarterPackMembers(starterPack: StarterPack) {
    loading.value = true;
    try {
      members.value = await blueskyClient.getStarterPackMembers(starterPack);
    } finally {
      loading.value = false;
    }
  }

  async function loadStarterPackMembersFromReference(reference: string) {
    loading.value = true;
    try {
      const starterPack = await blueskyClient.getStarterPackByReference(reference);
      members.value = await blueskyClient.getStarterPackMembers(starterPack);
      if (!starterPacks.value.some((pack) => pack.uri === starterPack.uri)) {
        starterPacks.value = [starterPack, ...starterPacks.value];
      }
      return starterPack;
    } finally {
      loading.value = false;
    }
  }

  async function searchActors(query: string) {
    loading.value = true;
    try {
      actorSearchResults.value = await blueskyClient.searchActors(query);
      return actorSearchResults.value;
    } finally {
      loading.value = false;
    }
  }

  async function loadStarterPacksForActor(actor: string) {
    loading.value = true;
    try {
      starterPacks.value = await blueskyClient.getStarterPacksByActor(actor);
    } finally {
      loading.value = false;
    }
  }

  async function convertListToStarterPack(payload: {
    name: string;
    description?: string;
    selectedMembers: ListMember[];
  }) {
    loading.value = true;
    try {
      const response = await blueskyClient.createStarterPackFromMembers({
        name: payload.name,
        description: payload.description,
        members: payload.selectedMembers,
      });
      operationResult.value = response.result;
      await refreshStarterPacks();
      return response;
    } finally {
      loading.value = false;
    }
  }

  async function addToExistingList(listUri: string, selectedMembers: ListMember[]) {
    loading.value = true;
    try {
      operationResult.value = await blueskyClient.addMembersToList(listUri, selectedMembers);
    } finally {
      loading.value = false;
    }
  }

  async function createNewListAndAddMembers(
    listName: string,
    selectedMembers: ListMember[],
    description?: string,
    isPrivate?: boolean,
  ) {
    loading.value = true;
    try {
      const listUri = await blueskyClient.createList({
        name: listName,
        description,
        private: isPrivate,
      });
      operationResult.value = await blueskyClient.addMembersToList(listUri, selectedMembers);
      await refreshLists();
      return listUri;
    } finally {
      loading.value = false;
    }
  }

  async function searchPosts(query: string, author?: string) {
    return blueskyClient.searchPosts(query, author);
  }

  function togglePostSelection(post: CuratedPost) {
    const idx = selectedPosts.value.findIndex((item) => item.uri === post.uri);
    if (idx >= 0) {
      selectedPosts.value.splice(idx, 1);
      return;
    }

    if (moderationMode.value) {
      pendingPosts.value.push({ ...post, approved: false });
      return;
    }

    selectedPosts.value.push(post);
  }

  function setModerationMode(value: boolean) {
    moderationMode.value = value;
    if (!value) {
      const approvedPending = pendingPosts.value.filter((post) => post.approved);
      selectedPosts.value = [...selectedPosts.value, ...approvedPending];
      pendingPosts.value = [];
    }
  }

  function approvePending(uri: string) {
    const target = pendingPosts.value.find((post) => post.uri === uri);
    if (!target) return;
    target.approved = true;
    selectedPosts.value.push(target);
    pendingPosts.value = pendingPosts.value.filter((post) => post.uri !== uri);
  }

  function rejectPending(uri: string) {
    pendingPosts.value = pendingPosts.value.filter((post) => post.uri !== uri);
  }

  function removeSelected(uri: string) {
    selectedPosts.value = selectedPosts.value.filter((post) => post.uri !== uri);
  }

  return {
    lists,
    starterPacks,
    actorSearchResults,
    members,
    loading,
    operationResult,
    selectedMemberCount,
    selectedPosts,
    moderationMode,
    pendingPosts,
    refreshLists,
    loadListMembers,
    refreshStarterPacks,
    loadStarterPackMembers,
    loadStarterPackMembersFromReference,
    searchActors,
    loadStarterPacksForActor,
    convertListToStarterPack,
    addToExistingList,
    createNewListAndAddMembers,
    searchPosts,
    togglePostSelection,
    setModerationMode,
    approvePending,
    rejectPending,
    removeSelected,
  };
});
