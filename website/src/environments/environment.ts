// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'http://localhost.flytrex.com:4040/api',
  overpassUrl: 'https://lz4.overpass-api.de/api/interpreter',
  geoapifyUrl: 'https://api.geoapify.com/v1/batch?apiKey=4a166fc2923e4594af1f7aa88927cb67',
  networkBufferRadius: 0.05, // in Km
  showNetworkBuffer: false,
  dateFormat: 'yyyy-MM-dd HH:mm', // other valid formats: https://angular.io/api/common/DatePipe#usage-notes
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
