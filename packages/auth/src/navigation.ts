export function buildPrimaryNavigation<TItem>(options: { items: TItem[] }): { items: TItem[] }[] {
	return [{ items: options.items }];
}
