import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NextMove Routing API',
      version: '1.0.0',
      description: 'API REST para cálculo de rutas, geocodificación y navegación usando Google Routes API. Diseñada para aplicaciones de movilidad sostenible con vehículos eléctricos y bicicletas.',
      contact: {
        name: 'NextMove Team',
        email: 'eric.moreno@estudiantat.upc.edu'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'http://51.94.90.40:3002/',
        description: 'Servidor de producción'
      }
    ],
    tags: [
      {
        name: 'Routing',
        description: 'Endpoints para cálculo de rutas y navegación'
      },
      {
        name: 'Geocoding',
        description: 'Endpoints para conversión entre direcciones y coordenadas'
      }
    ],
    components: {
      schemas: {
        Coordinates: {
          type: 'object',
          required: ['latitude', 'longitude'],
          properties: {
            latitude: {
              type: 'number',
              format: 'double',
              minimum: -90,
              maximum: 90,
              example: 41.9794,
              description: 'Latitud en grados decimales'
            },
            longitude: {
              type: 'number',
              format: 'double',
              minimum: -180,
              maximum: 180,
              example: 2.8214,
              description: 'Longitud en grados decimales'
            }
          }
        },
        RouteRequest: {
          type: 'object',
          required: ['origin', 'destination'],
          properties: {
            origin: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Coordenadas del punto de inicio'
            },
            destination: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Coordenadas del punto de destino'
            },
            preferences: {
              type: 'object',
              properties: {
                travelMode: {
                  type: 'string',
                  enum: ['DRIVE', 'BICYCLE', 'WALK', 'TWO_WHEELER', 'TRANSIT'],
                  default: 'DRIVE',
                  description: 'Modo de transporte'
                },
                routingPreference: {
                  type: 'string',
                  enum: ['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'],
                  default: 'TRAFFIC_AWARE_OPTIMAL',
                  description: 'Preferencia de enrutamiento. Solo para DRIVE y TWO_WHEELER'
                },
                avoidTolls: {
                  type: 'boolean',
                  default: false,
                  description: 'Evitar peajes'
                },
                avoidHighways: {
                  type: 'boolean',
                  default: false,
                  description: 'Evitar autopistas'
                },
                avoidFerries: {
                  type: 'boolean',
                  default: false,
                  description: 'Evitar ferries'
                }
              }
            }
          },
          example: {
            origin: {
              latitude: 41.9794,
              longitude: 2.8214
            },
            destination: {
              latitude: 41.3851,
              longitude: 2.1734
            },
            preferences: {
              travelMode: 'DRIVE',
              routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
              avoidTolls: false
            }
          }
        },
        Route: {
          type: 'object',
          properties: {
            distance: {
              type: 'string',
              example: '103.2 km',
              description: 'Distancia total en formato legible'
            },
            distanceMeters: {
              type: 'integer',
              example: 103218,
              description: 'Distancia total en metros'
            },
            duration: {
              type: 'string',
              example: '1h 31min',
              description: 'Duración estimada en formato legible'
            },
            durationSeconds: {
              type: 'integer',
              example: 5470,
              description: 'Duración estimada en segundos'
            },
            polyline: {
              type: 'string',
              description: 'Polyline codificado de Google que representa la geometría de la ruta. Decodificar con flutter_polyline_points para pintar en el mapa.'
            },
            isEcoFriendly: {
              type: 'boolean',
              example: true,
              description: 'Indica si Google marcó esta ruta como eco-friendly (optimizada para menor consumo)'
            },
            routeLabels: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['DEFAULT_ROUTE', 'ECO_FRIENDLY', 'DEFAULT_ROUTE_ALTERNATE']
              },
              description: 'Etiquetas asignadas por Google a la ruta'
            },
            travelAdvisory: {
              $ref: '#/components/schemas/TravelAdvisory'
            },
            steps: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/RouteStep'
              },
              description: 'Lista de pasos de navegación turn-by-turn'
            },
            startLocation: {
              $ref: '#/components/schemas/Coordinates'
            },
            endLocation: {
              $ref: '#/components/schemas/Coordinates'
            },
            viewport: {
              $ref: '#/components/schemas/Viewport'
            }
          }
        },
        TravelAdvisory: {
          type: 'object',
          properties: {
            hasTollRoads: {
              type: 'boolean',
              description: 'Indica si la ruta incluye peajes'
            },
            estimatedTollPrice: {
              type: 'string',
              nullable: true,
              example: '5.50 EUR',
              description: 'Precio estimado de peajes'
            },
            fuelConsumption: {
              type: 'string',
              nullable: true,
              example: '8.5 L',
              description: 'Consumo estimado de combustible'
            }
          }
        },
        RouteStep: {
          type: 'object',
          properties: {
            instruction: {
              type: 'string',
              example: 'Gira a la izquierda en Carrer Major',
              description: 'Instrucción de navegación en texto'
            },
            distance: {
              type: 'string',
              example: '0.5 km'
            },
            distanceMeters: {
              type: 'integer',
              example: 500
            },
            duration: {
              type: 'string',
              example: '2min'
            },
            durationSeconds: {
              type: 'integer',
              example: 120
            },
            startLocation: {
              $ref: '#/components/schemas/Coordinates'
            },
            endLocation: {
              $ref: '#/components/schemas/Coordinates'
            },
            polyline: {
              type: 'string',
              nullable: true,
              description: 'Polyline codificado de este paso específico'
            }
          }
        },
        Viewport: {
          type: 'object',
          description: 'Rectángulo que encierra toda la ruta. Útil para ajustar el zoom del mapa automáticamente.',
          properties: {
            low: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Esquina inferior izquierda (suroeste)'
            },
            high: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Esquina superior derecha (noreste)'
            }
          }
        },
        RouteResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                routes: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Route'
                  },
                  description: 'Todas las rutas calculadas'
                },
                recommendedRoute: {
                  $ref: '#/components/schemas/Route',
                  description: 'Ruta recomendada (prioriza eco-friendly)'
                },
                alternativeRoutesCount: {
                  type: 'integer',
                  example: 2,
                  description: 'Número de rutas alternativas'
                },
                ecoFriendlyOptionsCount: {
                  type: 'integer',
                  example: 1,
                  description: 'Número de rutas eco-friendly disponibles'
                }
              }
            }
          }
        },
        Location: {
          type: 'object',
          properties: {
            formattedAddress: {
              type: 'string',
              example: 'Plaça de la Independència, 17001 Girona, España',
              description: 'Dirección completa formateada'
            },
            coordinates: {
              $ref: '#/components/schemas/Coordinates'
            },
            placeId: {
              type: 'string',
              example: 'ChIJz7H9NskUpRIRGfpJIiLRnQ8',
              description: 'Identificador único de Google Maps'
            },
            types: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['street_address', 'political'],
              description: 'Tipos de lugar según Google Maps'
            }
          }
        },
        LocationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Location'
              }
            }
          }
        },
        ReverseGeocodeResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                  example: 'Plaça de la Independència, 17001 Girona, España'
                },
                coordinates: {
                  $ref: '#/components/schemas/Coordinates'
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Se requieren origen y destino'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;