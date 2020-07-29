export const NO_INIT_VALUE_ERROR = key => {
	throw new Error(`"${key}" is missing initial value. Specify its initial value using "X"`);
};

export const INVALID_VERB_ERROR = verb => {
	throw new Error(
		`INVALID VERB: "${verb}"\n` + `Either you misspelled it OR you forgot to add reducer for it`
	);
};
