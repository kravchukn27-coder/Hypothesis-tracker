// Shared column-width system (UI-008) for the Backlog and Experiments
// tables — explicit widths instead of each table's own ad hoc
// max-w-*/truncate choices, so both read as one consistent product.
export const NAME_COL = "w-64";
export const STATUS_COL = "w-40";
export const META_COL = "w-32";
// Reference width is Backlog's existing Comment column — wide enough
// to read comfortably, per the user.
export const LONG_TEXT_COL = "w-96";
export const DATE_COL = "w-60";
export const ACTION_COL = "w-12";
