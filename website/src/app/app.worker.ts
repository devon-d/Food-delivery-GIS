/// <reference lib="webworker" />
// /// <reference lib="webworker" />
//
// addEventListener('message', ({data}) => {
//   const response = `worker response to ${data}`;
//   console.log(response);
//   Cesium.sampleTerrainMostDetailed(this.cesiumService.getViewer().terrainProvider, data).then((updatedPositions) => {
//     postMessage(updatedPositions);
//   });
// });
addEventListener('message', ({data}) => {
  const response = `worker response to ${data}`;
  console.log(response);
  // c.sampleTerrainMostDetailed(this.cesiumService.getViewer().terrainProvider, data).then((updatedPositions) => {
  //   postMessage(updatedPositions);
  // });
});
