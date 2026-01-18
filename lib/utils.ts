import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Debounce utility function
 * Delays execution of a function until after a specified delay has elapsed
 * since the last time it was invoked.
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
	fn: T,
	ms: number,
): T & { cancel: () => void } {
	let timeoutId: NodeJS.Timeout | null = null;
	const debounced = ((...args: Parameters<T>) => {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), ms);
	}) as T & { cancel: () => void };
	debounced.cancel = () => {
		if (timeoutId) clearTimeout(timeoutId);
	};
	return debounced;
}

/**
 * Runtime utility for handling dynamic Tailwind arbitrary values.
 *
 * Tailwind's JIT compiler can't parse template literals like w-[${value}%] at build time,
 * but this function evaluates them at runtime and extracts them to inline styles.
 *
 * @example
 * <div {...tw(`w-[${percent}%] h-full bg-blue-500`)} />
 * // Returns: { className: "h-full bg-blue-500", style: { width: "75%" } }
 */

interface DynamicStyleResult {
	className: string;
	style: React.CSSProperties;
}

// Map Tailwind utility prefixes to CSS properties
const propertyMap: Record<string, keyof React.CSSProperties> = {
	'w': 'width',
	'h': 'height',
	'min-w': 'minWidth',
	'min-h': 'minHeight',
	'max-w': 'maxWidth',
	'max-h': 'maxHeight',
	'top': 'top',
	'right': 'right',
	'bottom': 'bottom',
	'left': 'left',
	'gap': 'gap',
	'text': 'fontSize',
};

/**
 * Process a className string with dynamic arbitrary values.
 * Extracts arbitrary values like w-[50%] and converts them to inline styles.
 */
export function tw(classNames: string): DynamicStyleResult {
	const style: React.CSSProperties = {};

	// Clean up whitespace
	let className = classNames.replace(/\s+/g, ' ').trim();

	// Match arbitrary value syntax: prefix-[value]
	// Examples: w-[50%], h-[100px], top-[20px]
	const arbitraryRegex = /(\w+(?:-\w+)*)-\[([^\]]+)\]/g;

	className = className.replace(arbitraryRegex, (match, prefix, value) => {
		const cssProperty = propertyMap[prefix];

		if (cssProperty) {
			// Add to inline styles
			style[cssProperty] = value;
			// Remove from className
			return '';
		}

		// Keep unhandled arbitrary values
		return match;
	});

	// Clean up extra spaces
	className = className.replace(/\s+/g, ' ').trim();

	return { className, style };
}
