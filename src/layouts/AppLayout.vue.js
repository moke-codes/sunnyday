import { RouterLink, useRouter } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
const auth = useAuthStore();
const ui = useUiStore();
const router = useRouter();
async function logout() {
    await auth.logout();
    ui.notifyInfo('Logged out.');
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
    ...{ class: "border-b border-amber-300 bg-gradient-to-r from-amber-100 via-orange-100 to-sky-100/90 backdrop-blur dark:border-amber-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" },
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
    ...{ class: "text-lg font-semibold text-amber-950 dark:text-amber-200" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs text-amber-800 dark:text-amber-300/70" },
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
    ...{ class: "rounded-md border border-amber-400 bg-white/85 px-3 py-2 text-sm text-amber-950 hover:bg-amber-200 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-100 dark:hover:bg-slate-700" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "mx-auto flex max-w-7xl gap-2 px-4 pb-3 text-sm" },
});
const __VLS_3 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    to: "/tools/list-to-starter-pack",
}));
const __VLS_5 = __VLS_4({
    to: "/tools/list-to-starter-pack",
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
{
    const { default: __VLS_thisSlot } = __VLS_6.slots;
    const [{ isActive }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "inline-flex rounded-md px-3 py-1.5" },
        ...{ class: (isActive
                ? 'bg-amber-200/70 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100'
                : 'text-amber-900 hover:bg-amber-200/70 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-slate-800 dark:hover:text-amber-200') },
    });
    __VLS_6.slots['' /* empty slot name completion */];
}
var __VLS_6;
const __VLS_7 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    to: "/tools/starter-pack-to-list",
}));
const __VLS_9 = __VLS_8({
    to: "/tools/starter-pack-to-list",
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
{
    const { default: __VLS_thisSlot } = __VLS_10.slots;
    const [{ isActive }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "inline-flex rounded-md px-3 py-1.5" },
        ...{ class: (isActive
                ? 'bg-amber-200/70 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100'
                : 'text-amber-900 hover:bg-amber-200/70 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-slate-800 dark:hover:text-amber-200') },
    });
    __VLS_10.slots['' /* empty slot name completion */];
}
var __VLS_10;
const __VLS_11 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    to: "/tools/curated-feed",
}));
const __VLS_13 = __VLS_12({
    to: "/tools/curated-feed",
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
{
    const { default: __VLS_thisSlot } = __VLS_14.slots;
    const [{ isActive }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "inline-flex rounded-md px-3 py-1.5" },
        ...{ class: (isActive
                ? 'bg-amber-200/70 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100'
                : 'text-amber-900 hover:bg-amber-200/70 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-slate-800 dark:hover:text-amber-200') },
    });
    __VLS_14.slots['' /* empty slot name completion */];
}
var __VLS_14;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "mx-auto max-w-7xl px-4 py-6" },
});
var __VLS_15 = {};
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-2" },
});
for (const [toast] of __VLS_getVForSourceType((__VLS_ctx.ui.toasts))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (toast.id),
        ...{ class: "pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg" },
        ...{ class: (toast.kind === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100'
                : toast.kind === 'error'
                    ? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-100'
                    : 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100') },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-start justify-between gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "leading-5" },
    });
    (toast.text);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.ui.dismissToast(toast.id);
            } },
        ...{ class: "rounded px-1 text-xs opacity-80 hover:opacity-100" },
        'aria-label': "Dismiss notification",
    });
}
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-amber-300']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-amber-100']} */ ;
/** @type {__VLS_StyleScopedClasses['via-orange-100']} */ ;
/** @type {__VLS_StyleScopedClasses['to-sky-100/90']} */ ;
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
/** @type {__VLS_StyleScopedClasses['text-amber-950']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-300/70']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-amber-400']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white/85']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-amber-950']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-amber-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-amber-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:bg-slate-800']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-amber-100']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:hover:bg-slate-700']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-7xl']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-7xl']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['right-4']} */ ;
/** @type {__VLS_StyleScopedClasses['top-4']} */ ;
/** @type {__VLS_StyleScopedClasses['z-[70]']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['pointer-events-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['leading-5']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['px-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-80']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:opacity-100']} */ ;
// @ts-ignore
var __VLS_16 = __VLS_15;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            ThemeToggle: ThemeToggle,
            ui: ui,
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
