export const NO_INIT_VALUE_ERROR = key => {
	throw new Error(`"${key}" is missing initial value. Specify its initial value using "X"`);
};

export const NO_REACTIVE_CALCULATOR = key => {
	throw new Error(
		`"${key}" is missing reactive calculator function X. Specify the function on key "X"`
	);
};

export const INVALID_VERB_ERROR = (verb, compName) => {
	throw new Error(
		`INVALID VERB: "${verb}" in "${compName}" Component\n` +
			`Either you misspelled it OR you forgot to add reducer for it`
	);
};

export const CYCLIC_DEPENDENCY_ERROR = keys => {
	throw new Error(
		`ERROR: Cyclic Dependancy found involving keys:  ${keys}. \nCheck the dependency array of these keys and remove cyclic dependancy`
	);
};

export const INVALID_DEP_ERROR = (d, key) => {
	throw new Error(`invalid dependancy "${d}" added in "${key}". \nNo such state exist in store.`);
};
