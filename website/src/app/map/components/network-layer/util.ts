import {NodeType} from './models/node-type';
import {v4 as uuidv4} from 'uuid';
import {Cartesian3, EditPoint} from 'angular-cesium';
import {Location} from '../../models/location';
import {Util} from '../../util';
import {INodeProps} from '../../../project/models/project';
import {NetworkEdge, NetworkNode} from './models/gcs-network';

export function findNodeWithLatLng(nodeArr: NetworkNode[], lon: number, lat: number): NetworkNode {
  return nodeArr.find(node =>
    Number(node.latitude_deg) === lat && Number(node.longitude_deg) === lon && node.node_type !== NodeType.DELIVERY.toLowerCase());
}

export function isCloseTo(left: Cartesian3, right: Cartesian3): boolean {
  const tolerance = 1; // meters
  const distance = Cesium.Cartesian3.distance(left, right);
  return distance <= tolerance;
}

// export function findNodeWithLatLng(nodeArr: NetworkNode[], lon: string, lat: string): NetworkNode {
//   const tolerance = 1; // meters
//   const searchCartesian = Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat));
//   return nodeArr.find(node => {
//     const nodeCartesian = Cesium.Cartesian3.fromDegrees(Number(node.longitude_deg), Number(node.latitude_deg));
//     const distance = Cesium.Cartesian3.distance(searchCartesian, nodeCartesian);
//     if (distance <= tolerance && node.node_type !== NodeType.DELIVERY.toLowerCase()) {
//       return node;
//     }
//   });
// }

export function createNodeFromEditPoint(id: number, editPoint: EditPoint, flightAltitude: number): NetworkNode {
  const location = Util.cartesian3ToLocation(editPoint.getPosition());
  // @ts-ignore
  const type = editPoint.secondaryMarker?.nodeType || NodeType.WAYPOINT;
  const altitude = editPoint.flightAltitude || flightAltitude;
  return createNetworkNode(id, 'WP ' + id, type, location, altitude);
}

export function createNetworkNode(
  id: number, name: string, type: NodeType | string, location: Location, flightAltitude: number
): NetworkNode {
  return {
    id,
    name,
    uuid: uuidv4(),
    node_type: type?.toString()?.toLowerCase(),
    longitude_deg: location.lon.toString(),
    latitude_deg: location.lat.toString(),
    flight_altitude_m: flightAltitude,
    ground_elevation_m: location.alt,
    network_id: 0
  };
}

export function createNetworkEdge(id: number, fromVertexId: number, toVertexId: number): NetworkEdge {
  return {
    id,
    from_vertex_id: fromVertexId,
    to_vertex_id: toVertexId,
    network_id: 0
  };
}

export function sortSegmentNodes(segmentNodes: NetworkNode[]): NetworkNode[] {
  if (segmentNodes?.length === 0) {
    return [];
  }

  const startNode = segmentNodes[0];
  const startCartesian = Cesium.Cartesian3.fromDegrees(Number(startNode.longitude_deg), Number(startNode.latitude_deg));

  segmentNodes.sort((firstNode, secondNode): number => {
    const cartesianA = Cesium.Cartesian3.fromDegrees(Number(firstNode.longitude_deg), Number(firstNode.latitude_deg));
    const cartesianB = Cesium.Cartesian3.fromDegrees(Number(secondNode.longitude_deg), Number(secondNode.latitude_deg));
    const distanceA = Cesium.Cartesian3.distance(startCartesian, cartesianA);
    const distanceB = Cesium.Cartesian3.distance(startCartesian, cartesianB);
    return distanceA - distanceB;
  });

  return segmentNodes;
}


export function findNodeProps(propsArray: INodeProps[], segmentIndex: number, pointIndex: number): INodeProps {
  return propsArray?.find(props => props.segment_index === segmentIndex && props.waypoint_index === pointIndex);
}
