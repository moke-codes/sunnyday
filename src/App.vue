<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useUiStore } from '@/stores/ui';

useUiStore();
</script>
