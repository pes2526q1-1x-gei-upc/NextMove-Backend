export function mapRepositoryToGraphQL(dbStation, dynamicData) {
  const staticConnectors = [];
  
  if (dbStation.ccs_power_kw) {
    staticConnectors.push({ type: 'CCS', powerKw: parseFloat(dbStation.ccs_power_kw) });
  }
  if (dbStation.chademo_power_kw) {
    staticConnectors.push({ type: 'CHADEMO', powerKw: parseFloat(dbStation.chademo_power_kw) });
  }
  if (dbStation.mennekes_power_kw) {
    staticConnectors.push({ type: 'MENNEKES', powerKw: parseFloat(dbStation.mennekes_power_kw) });
  }
  if (dbStation.schuko_power_kw) {
    staticConnectors.push({ type: 'SCHUKO', powerKw: parseFloat(dbStation.schuko_power_kw) });
  }

  const connectorsWithStatus = staticConnectors.map(connector => {
    const dynamicInfo = dynamicData?.connectors?.find(dc => dc.type === connector.type);
    return {
      ...connector,
      status: dynamicInfo?.status || 'UNAVAILABLE',
      statusCode: dynamicInfo?.statusCode || '-'
    };
  });

  return {
    id: dbStation.id,  
    externalId: dbStation.external_id, 
    name: dbStation.name,
    address: dbStation.address,
    city: dbStation.city,
    coordinates: {
      longitude: parseFloat(dbStation.longitude),
      latitude: parseFloat(dbStation.latitude)
    },
    connectors: connectorsWithStatus,
    distance: dbStation.distance ? parseFloat(dbStation.distance) : null,
    accessType: dynamicData?.accessType || null,
    isSuperFast: dynamicData?.isSuperFast || false,
    lastUpdated: dynamicData?.lastUpdated || null
  };
}

export function extractDynamicData(icaenFeature) {
  const props = icaenFeature.properties;
  const connectors = [];

  if (props.estatccs && props.estatccs !== '-') {
    connectors.push({
      type: 'CCS',
      status: mapStatus(props.estatccs),
      statusCode: props.estatccs,
      chargingTime: parseInt(props.tempsccs) || 0
    });
  }

  if (props.estatcha && props.estatcha !== '-') {
    connectors.push({
      type: 'CHADEMO',
      status: mapStatus(props.estatcha),
      statusCode: props.estatcha,
      chargingTime: parseInt(props.tempscha) || 0
    });
  }

  if (props.estatmnk1 && props.estatmnk1 !== '-') {
    connectors.push({
      type: 'MENNEKES',
      status: mapStatus(props.estatmnk1),
      statusCode: props.estatmnk1,
      chargingTime: parseInt(props.tempsmnk1) || 0
    });
  }

  if (props.estatmnk2 && props.estatmnk2 !== '-' && props.estatmnk2 !== props.estatmnk1) {
    connectors.push({
      type: 'MENNEKES',
      status: mapStatus(props.estatmnk2),
      statusCode: props.estatmnk2,
      chargingTime: parseInt(props.tempsmnk2) || 0
    });
  }

  return {
    connectors,
    lastUpdated: props.data,
    accessType: props.tipus_acces,
    isSuperFast: props.superrapid === '1' || props.superrapid === '2'
  };
}

function mapStatus(estatCode) {
  switch (estatCode) {
  case '0':
    return 'OCCUPIED';
  case '1':
    return 'AVAILABLE';
  case '-':
    return 'UNAVAILABLE';
  default:
    return 'UNAVAILABLE';
  }
}

export function mapICAENToRepository(icaenFeature) {
  const props = icaenFeature.properties;
  const [longitude, latitude] = icaenFeature.geometry.coordinates;

  const connectors = parseConnectors(props);

  return {
    id: props.id,
    name: props.nom || props.id || 'Estación sin nombre',
    address: props.carrer || null,
    city: props.ciutat || null,
    longitude,
    latitude,
    ccs_power_kw: connectors.CCS,
    chademo_power_kw: connectors.CHADEMO,
    mennekes_power_kw: connectors.MENNEKES,
    schuko_power_kw: connectors.SCHUKO
  };
}

function parseConnectors(properties) {
  const connectors = {
    CCS: null,
    CHADEMO: null,
    MENNEKES: null,
    SCHUKO: null
  };

  if (properties.estatccs && properties.estatccs !== '-') {
    const power = parseFloat(properties.potenciaccs);
    connectors.CCS = power > 0 ? power : inferPowerFromType('CCS', properties);
  }

  if (properties.estatcha && properties.estatcha !== '-') {
    const power = parseFloat(properties.potenciacha);
    connectors.CHADEMO = power > 0 ? power : inferPowerFromType('CHADEMO', properties);
  }

  const hasMennekes1 = properties.estatmnk1 && properties.estatmnk1 !== '-';
  const hasMennekes2 = properties.estatmnk2 && properties.estatmnk2 !== '-';
  
  if (hasMennekes1 || hasMennekes2) {
    const power1 = parseFloat(properties.potenciamnk1) || 0;
    const power2 = parseFloat(properties.potenciamnk2) || 0;
    const maxPower = Math.max(power1, power2);
    connectors.MENNEKES = maxPower > 0 ? maxPower : inferPowerFromType('MENNEKES', properties);
  }

  if (properties.shucko === '1') {
    connectors.SCHUKO = 3.7;
  }

  return connectors;
}

function inferPowerFromType(connectorType, properties) {
  const superrapid = properties.superrapid;

  if (superrapid === '2') {
    if (connectorType === 'CCS') return 150;
    if (connectorType === 'CHADEMO') return 150;
  } else if (superrapid === '1') {
    if (connectorType === 'CCS') return 50;
    if (connectorType === 'CHADEMO') return 50;
    if (connectorType === 'MENNEKES') return 43;
  } else {
    if (connectorType === 'CCS') return 50;
    if (connectorType === 'CHADEMO') return 50;
    if (connectorType === 'MENNEKES') return 22;
  }

  const defaults = {
    'CCS': 50,
    'CHADEMO': 50,
    'MENNEKES': 22,
    'SCHUKO': 3.7
  };

  return defaults[connectorType] || null;
}

export const extractDynamicConnectorInfo = extractDynamicData;