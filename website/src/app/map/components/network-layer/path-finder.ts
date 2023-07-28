import {EditPoint, PolylineEditorObservable} from 'angular-cesium';
import * as Graph from 'node-dijkstra';
import {NodeType} from './models/node-type';

export class PathFinder {
  private semaphores: EditPoint[] = [];
  private visitedNodeIds: string[] = [];
  private route: Graph;

  constructor(polylines$: PolylineEditorObservable[]) {
    this.calculate(polylines$);
  }

  getDistanceFromNearestSemaphore(point: EditPoint): string {
    let minDistance = Number.POSITIVE_INFINITY;
    // @ts-ignore
    if (point.secondaryMarker?.nodeType == null || point.secondaryMarker.nodeType !== NodeType.SEMAPHORE) {
      this.semaphores.forEach(sema => {
        const pathAndCost = this.route.path(point.getId(), sema.nodeId, {cost: true});
        if (pathAndCost.path && pathAndCost.cost < minDistance) {
          minDistance = pathAndCost.cost;
        }
      });
    }
    return (minDistance === Number.POSITIVE_INFINITY) ? '' : parseFloat((minDistance).toFixed(0)) + ' m';
  }

  private calculate(polylines$: PolylineEditorObservable[]): any {
    this.route = new Graph();
    this.visitedNodeIds = [];
    this.semaphores = [];
    // reset all nodeIds
    polylines$.forEach(poly => {
      const points = poly.getCurrentPoints();
      points.forEach(p => p.nodeId = null);
    });

    // nodeIds should be same for bounded points
    polylines$.forEach(poly => {
      const points = poly.getCurrentPoints();
      points.forEach((point) => {
        if (point.nodeId == null) {
          point.nodeId = point.getId();
        }
        point.boundTo?.forEach(b => {
          if (b.nodeId == null && b.getId() > point.getId()) {
            b.nodeId = point.getId();
          }
        });
      });
    });

    // now get connected points for each point in the network
    polylines$.forEach(poly => {
      const points = poly.getCurrentPoints();
      points.forEach((point, index) => {
        const boundPoints = [];

        if (point.boundTo) {
          // if this point (or it's bounded points) has same nodeId as one of the visited nodes (bounded points have same nodeId)
          // then skip this node because neighbours are same
          const visitedBoundPoint = point.boundTo.find(p => this.visitedNodeIds.includes(p.nodeId));
          if (visitedBoundPoint || this.visitedNodeIds.includes(point.nodeId)) {
            return;
          } else {
            boundPoints.push(...point.boundTo);
          }
        }

        // find points connected to current point
        // and then add them to the route as possible connections from the point
        const connectedPoints = this.getConnectedPoints(polylines$, poly, index, boundPoints);
        const nodes = {};
        connectedPoints.forEach(p => {
          nodes[p.nodeId] = Cesium.Cartesian3.distance(p.getPosition(), point.getPosition());
        });
        this.route.addNode(point.nodeId, nodes);

        // keep track of semaphores because we need to calculate distance
        // @ts-ignore
        if (point.secondaryMarker?.nodeType === NodeType.SEMAPHORE) {
          this.semaphores.push(point);
        }

        this.visitedNodeIds.push(point.nodeId);
      });
    });
  }

  private getConnectedPoints(
    polylines: PolylineEditorObservable[], polyline: PolylineEditorObservable,
    currentPointIndex: number, boundPoints: EditPoint[]
  ): EditPoint[] {
    const connectedPoints = [];
    const points = polyline.getCurrentPoints();
    let next = points[currentPointIndex + 1];
    let previous = points[currentPointIndex - 1];
    if (next) {
      const traversedBoundPoint = next.boundTo?.find(b => this.visitedNodeIds.includes(b.nodeId));
      if (traversedBoundPoint) {
        next = traversedBoundPoint;
      }
      connectedPoints.push(next);
    }
    if (previous) {
      const traversedBoundPoint = previous.boundTo?.find(b => this.visitedNodeIds.includes(b.nodeId));
      if (traversedBoundPoint) {
        previous = traversedBoundPoint;
      }
      connectedPoints.push(previous);
    }

    if (boundPoints.length > 0) {
      const boundPoint = boundPoints.pop();
      const boundPolyline = polylines.find(line => boundPoint.getEditedEntityId() === line.getEditValue().id);
      if (boundPolyline) {
        const pointIndex = boundPolyline.getCurrentPoints().findIndex(point => point.nodeId === boundPoint.nodeId);
        connectedPoints.push(...this.getConnectedPoints(polylines, boundPolyline, pointIndex, boundPoints));
      }
    }
    return connectedPoints;
  }
}
