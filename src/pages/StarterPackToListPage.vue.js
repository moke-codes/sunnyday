import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppLayout from '@/layouts/AppLayout.vue';
import MemberPicker from '@/components/MemberPicker.vue';
import { useToolsStore } from '@/stores/tools';
const tools = useToolsStore();
const actorQuery = ref('');
const isActorDropdownOpen = ref(false);
const isSearchingActors = ref(false);
const highlightedIndex = ref(-1);
const searchContainer = ref(null);
const selectedStarterPackUri = ref('');
const selectedMemberDids = ref([]);
const referenceError = ref('');
let actorSearchTimer;
const destinationMode = ref('existing');
const existingListUri = ref('');
const newListName = ref('');
const newListDescription = ref('');
const isPrivate = ref(false);
const selectedMembers = computed(() => {
    const didSet = new Set(selectedMemberDids.value);
    return tools.members.filter((member) => didSet.has(member.did));
});
const showActorDropdown = computed(() => {
    if (!isActorDropdownOpen.value)
        return false;
    if (isSearchingActors.value)
        return true;
    return actorQuery.value.trim().length >= 2;
});
const highlightedActorDid = computed(() => {
    const actor = tools.actorSearchResults[highlightedIndex.value];
    return actor?.did;
});
onMounted(async () => {
    if (!tools.lists.length)
        await tools.refreshLists();
    document.addEventListener('click', onDocumentClick);
});
onBeforeUnmount(() => {
    if (actorSearchTimer)
        window.clearTimeout(actorSearchTimer);
    document.removeEventListener('click', onDocumentClick);
});
watch(actorQuery, (value) => {
    const query = value.trim();
    referenceError.value = '';
    if (actorSearchTimer)
        window.clearTimeout(actorSearchTimer);
    if (query.length < 2) {
        tools.actorSearchResults = [];
        isSearchingActors.value = false;
        highlightedIndex.value = -1;
        return;
    }
    isSearchingActors.value = true;
    actorSearchTimer = window.setTimeout(async () => {
        try {
            await tools.searchActors(query);
            highlightedIndex.value = tools.actorSearchResults.length ? 0 : -1;
        }
        catch (error) {
            referenceError.value = error.message || 'Could not search users.';
        }
        finally {
            isSearchingActors.value = false;
        }
    }, 300);
});
async function selectActor(actor) {
    referenceError.value = '';
    actorQuery.value = actor.handle;
    isActorDropdownOpen.value = false;
    selectedStarterPackUri.value = '';
    selectedMemberDids.value = [];
    tools.members = [];
    highlightedIndex.value = -1;
    try {
        await tools.loadStarterPacksForActor(actor.did);
        if (!tools.starterPacks.length) {
            referenceError.value = 'No starter packs found for this user.';
        }
    }
    catch (error) {
        referenceError.value = error.message || 'Could not load starter packs for this user.';
    }
}
async function loadMembers() {
    referenceError.value = '';
    const starterPack = tools.starterPacks.find((pack) => pack.uri === selectedStarterPackUri.value);
    if (!starterPack)
        return;
    await tools.loadStarterPackMembers(starterPack);
    selectedMemberDids.value = tools.members.map((member) => member.did);
}
async function applyMembers() {
    if (destinationMode.value === 'existing') {
        if (!existingListUri.value)
            return;
        await tools.addToExistingList(existingListUri.value, selectedMembers.value);
        return;
    }
    if (!newListName.value)
        return;
    await tools.createNewListAndAddMembers(newListName.value, selectedMembers.value, newListDescription.value || undefined, isPrivate.value);
}
function initials(name) {
    return name.trim().charAt(0).toUpperCase() || '?';
}
function openDropdown() {
    isActorDropdownOpen.value = true;
}
function closeDropdown() {
    isActorDropdownOpen.value = false;
}
function moveHighlight(step) {
    if (!isActorDropdownOpen.value) {
        isActorDropdownOpen.value = true;
    }
    const count = tools.actorSearchResults.length;
    if (!count)
        return;
    const next = highlightedIndex.value + step;
    if (next < 0) {
        highlightedIndex.value = count - 1;
        return;
    }
    if (next >= count) {
        highlightedIndex.value = 0;
        return;
    }
    highlightedIndex.value = next;
}
async function selectHighlightedActor() {
    if (!showActorDropdown.value)
        return;
    const actor = tools.actorSearchResults[highlightedIndex.value];
    if (!actor)
        return;
    await selectActor(actor);
}
function onDocumentClick(event) {
    const container = searchContainer.value;
    if (!container)
        return;
    if (!container.contains(event.target)) {
        closeDropdown();
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {[typeof AppLayout, typeof AppLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(AppLayout, new AppLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "space-y-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "text-xl font-semibold" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-slate-600 dark:text-slate-400" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "text-sm md:col-span-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "searchContainer",
    ...{ class: "relative mt-1" },
});
/** @type {typeof __VLS_ctx.searchContainer} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onFocus: (__VLS_ctx.openDropdown) },
    ...{ onKeydown: (...[$event]) => {
            __VLS_ctx.moveHighlight(1);
        } },
    ...{ onKeydown: (...[$event]) => {
            __VLS_ctx.moveHighlight(-1);
        } },
    ...{ onKeydown: (__VLS_ctx.selectHighlightedActor) },
    ...{ onKeydown: (__VLS_ctx.closeDropdown) },
    ...{ class: "w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
    placeholder: "name or handle",
});
(__VLS_ctx.actorQuery);
if (__VLS_ctx.showActorDropdown) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900" },
    });
    if (__VLS_ctx.isSearchingActors) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "px-3 py-2 text-xs text-slate-500 dark:text-slate-400" },
        });
    }
    for (const [actor] of __VLS_getVForSourceType((__VLS_ctx.tools.actorSearchResults))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.showActorDropdown))
                        return;
                    __VLS_ctx.selectActor(actor);
                } },
            ...{ onMouseenter: (...[$event]) => {
                    if (!(__VLS_ctx.showActorDropdown))
                        return;
                    __VLS_ctx.highlightedIndex = __VLS_ctx.tools.actorSearchResults.findIndex((item) => item.did === actor.did);
                } },
            key: (actor.did),
            type: "button",
            ...{ class: "flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800" },
            ...{ class: ({
                    'bg-slate-50 dark:bg-slate-800': actor.did === __VLS_ctx.highlightedActorDid,
                }) },
        });
        if (actor.avatar) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (actor.avatar),
                alt: (actor.displayName || actor.handle),
                ...{ class: "h-8 w-8 rounded-full object-cover" },
                loading: "lazy",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100" },
            });
            (__VLS_ctx.initials(actor.displayName || actor.handle));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "min-w-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "truncate font-medium" },
        });
        (actor.displayName || actor.handle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "truncate text-xs text-slate-500" },
        });
        (actor.handle);
    }
    if (!__VLS_ctx.isSearchingActors && __VLS_ctx.actorQuery.trim().length >= 2 && !__VLS_ctx.tools.actorSearchResults.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "px-3 py-2 text-xs text-slate-500 dark:text-slate-400" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "text-sm md:col-span-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedStarterPackUri),
    ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
for (const [pack] of __VLS_getVForSourceType((__VLS_ctx.tools.starterPacks))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (pack.uri),
        value: (pack.uri),
    });
    (pack.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadMembers) },
    ...{ class: "mt-6 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" },
});
if (__VLS_ctx.referenceError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-red-600" },
    });
    (__VLS_ctx.referenceError);
}
if (__VLS_ctx.tools.members.length) {
    /** @type {[typeof MemberPicker, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(MemberPicker, new MemberPicker({
        modelValue: (__VLS_ctx.selectedMemberDids),
        members: (__VLS_ctx.tools.members),
    }));
    const __VLS_5 = __VLS_4({
        modelValue: (__VLS_ctx.selectedMemberDids),
        members: (__VLS_ctx.tools.members),
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "text-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.destinationMode),
    ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "existing",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "new",
});
if (__VLS_ctx.destinationMode === 'existing') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.existingListUri),
        ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [list] of __VLS_getVForSourceType((__VLS_ctx.tools.lists))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (list.uri),
            value: (list.uri),
        });
        (list.name);
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
    });
    (__VLS_ctx.newListName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "text-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" },
    });
    (__VLS_ctx.newListDescription);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "inline-flex items-center gap-2 text-sm md:col-span-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.isPrivate);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.applyMembers) },
    ...{ class: "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900 md:col-span-2" },
    disabled: (__VLS_ctx.tools.loading || !__VLS_ctx.selectedMemberDids.length),
});
(__VLS_ctx.tools.loading ? 'Applying...' : 'Apply Members');
if (__VLS_ctx.tools.operationResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" },
    });
    (__VLS_ctx.tools.operationResult.added);
    (__VLS_ctx.tools.operationResult.skipped);
    (__VLS_ctx.tools.operationResult.unresolved.length);
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['z-20']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['max-h-80']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-left']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-slate-50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['h-8']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['object-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-8']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-400']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-slate-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-emerald-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-emerald-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-emerald-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-emerald-950/50']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-emerald-200']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AppLayout: AppLayout,
            MemberPicker: MemberPicker,
            tools: tools,
            actorQuery: actorQuery,
            isSearchingActors: isSearchingActors,
            highlightedIndex: highlightedIndex,
            searchContainer: searchContainer,
            selectedStarterPackUri: selectedStarterPackUri,
            selectedMemberDids: selectedMemberDids,
            referenceError: referenceError,
            destinationMode: destinationMode,
            existingListUri: existingListUri,
            newListName: newListName,
            newListDescription: newListDescription,
            isPrivate: isPrivate,
            showActorDropdown: showActorDropdown,
            highlightedActorDid: highlightedActorDid,
            selectActor: selectActor,
            loadMembers: loadMembers,
            applyMembers: applyMembers,
            initials: initials,
            openDropdown: openDropdown,
            closeDropdown: closeDropdown,
            moveHighlight: moveHighlight,
            selectHighlightedActor: selectHighlightedActor,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
