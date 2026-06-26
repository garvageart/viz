export const dragState = $state({
    isActive: false,
    type: null as string | null,
    payload: null as unknown,
    source: null as string | null
});

export function clearDragState() {
    dragState.isActive = false;
    dragState.type = null;
    dragState.payload = null;
    dragState.source = null;
}

export function setDragState(type: string, payload: unknown, source?: string) {
    dragState.isActive = true;
    dragState.type = type;
    dragState.payload = payload;
    dragState.source = source ?? null;
}
