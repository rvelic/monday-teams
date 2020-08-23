import moment from 'moment'

export const START_YEAR = 2020
export const NUM_OF_YEARS = 2
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_PER_YEAR = 12
export const QUARTERS_PER_YEAR = 4
export const MONTHS_PER_QUARTER = 3
export const NUM_OF_MONTHS = NUM_OF_YEARS * MONTHS_PER_YEAR
export const MAX_TRACK_START_GAP = 4
export const MAX_ELEMENT_GAP = 8
export const MAX_MONTH_SPAN = 8
export const MIN_MONTH_SPAN = 2
// MONTH => HOUR, QUARTER => DAY, YEAR => WEEK
export const NUM_OF_WEEKS = 2
export const START_DATE = moment().startOf('isoWeek')
export const END_DATE = START_DATE.clone().add(NUM_OF_WEEKS, 'w')
export const DAYS_PER_WEEK = 7
export const HOURS_PER_DAY = 24
export const HOURS_PER_WEEK = HOURS_PER_DAY * DAYS_PER_WEEK
export const NUM_OF_HOURS = NUM_OF_WEEKS * HOURS_PER_WEEK
export const MAX_HOUR_SPAN = 8
export const MIN_HOUR_SPAN = 4
export const MIN_ZOOM = 100
export const MAX_ZOOM = 2000