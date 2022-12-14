export const URL_REGEX = new RegExp(
  '^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|(www\\.)?){1}([0-9A-Za-z-\\.@:%_+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?',
);

/**
 * Check if input is url.
 * @param input
 */
export const isURL = (input: any): boolean => {
  return URL_REGEX.test(input);
};
