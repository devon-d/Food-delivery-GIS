# CesiumJS-MVP
This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 11.2.0.

## Prerequisites:
Install: 
- [Nodejs](https://nodejs.org/en/download/) 
- [Yarn](https://classic.yarnpkg.com/en/docs/install)  `npm install -g yarn`
- [Angular CLI](https://cli.angular.io/) `npm install -g @angular/cli`

## Development server
Run `yarn install` in the root folder, then
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Controls
- Left Click on Polygon: Opens context menu
- Right Click: Selects point and makes it editable
- Right Click & Drag: Moves editable point
- Left Arrow Key: Selects and zooms to previous point
- Right Arrow Key: Selects and zooms to next point
- Enter Key: Locks current selected point and moves to next point automatically

## Building point color codes:
- White: Non-editable point
- Yellow: Editable point
- Green: Locked point

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
