import { RouterLink, useRouter } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();
const router = useRouter();
async function logout() {
    await auth.logout();
    await router.push('/login');
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "min-h-screen" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-sky-50/80 backdrop-blur dark:border-amber-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mx-auto flex max-w-7xl items-center justify-between px-4 py-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex items-center gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-sm shadow-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "text-lg font-semibold text-amber-900 dark:text-amber-200" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs text-amber-700/80 dark:text-amber-300/70" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex items-center gap-3" },
});
/** @type {[typeof ThemeToggle, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ThemeToggle, new ThemeToggle({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.logout) },
    ...{ class: "rounded-md border border-amber-300 bg-white/80 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-100 dark:hover:bg-slate-700" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "mx-auto flex max-w-7xl gap-4 px-4 pb-3 text-sm" },
});
const __VLS_3 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    ...{ class: "text-amber-800/90 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200" },
    to: "/tools/list-to-starter-pack",
}));
const __VLS_5 = __VLS_4({
    ...{ class: "text-amber-800/90 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200" },
    to: "/tools/list-to-starter-pack",
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
var __VLS_6;
const __VLS_7 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    ...{ class: "text-amber-800/90 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200" },
    to: "/tools/starter-pack-to-list",
}));
const __VLS_9 = __VLS_8({
    ...{ class: "text-amber-800/90 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200" },
    to: "/tools/starter-pack-to-list",
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
__VLS_10.slots.default;
var __VLS_10;
const __VLS_11 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    ...{ class: "text-amber-800/90 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200" },
    to: "/tools/curated-feed",
}));
const __VLS_13 = __VLS_12({
    ...{ class: "text-amber-800/90 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200" },
    to: "/tools/curated-feed",
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_14.slots.default;
var __VLS_14;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "mx-auto max-w-7xl px-4 py-6" },
});
var __VLS_15 = {};
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-amber-50']} */ ;
/** @type {__VLS_StyleScopedClasses['via-orange-50']} */ ;
/** @type {__VLS_StyleScopedClasses['to-sky-50/80']} */ ;
/** @type {__VLS_StyleScopedClasses['backdrop-blur']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-amber-900/40']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:from-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:via-slate-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:to-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-7xl']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-9']} */ ;
/** @type {__VLS_StyleScopedClasses['w-9']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-br']} */ ;
/** @type {__VLS_StyleScopedClasses['from-amber-300']} */ ;
/** @type {__VLS_StyleScopedClasses['to-orange-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-900']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-700/80']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-300/70']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-amber-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/80']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-900']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-amber-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-amber-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-7xl']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-800/90']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-amber-950']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-800/90']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-amber-950']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-800/90']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-amber-950']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-300']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-7xl']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
// @ts-ignore
var __VLS_16 = __VLS_15;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            ThemeToggle: ThemeToggle,
            logout: logout,
        };
    },
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
