import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NextMove Routing API',
      version: '1.0.0',
      description: `
# API REST para NextMove

API REST para cálculo de rutas, geocodificación y navegación usando Google Routes API.
Diseñada para aplicaciones de movilidad sostenible con vehículos eléctricos y bicicletas.

## Autenticación

Todos los endpoints requieren autenticación mediante API Key. Para obtener acceso:

1. Contacta con el equipo de NextMove para registrar tu empresa
2. Recibirás una API Key única para tu empresa
3. Incluye el header \`X-API-Key: tu_api_key\` en todas las peticiones

### Cómo probar en Swagger UI

1. Haz clic en el botón **"Authorize"** (icono de candado) en la parte superior derecha
2. Ingresa tu API Key en el campo "Value"
3. Haz clic en "Authorize" y luego "Close"
4. Ahora puedes probar los endpoints usando el botón "Try it out" y "Execute"
5. Tu API Key se incluirá automáticamente en todas las peticiones

## Rate Limiting

Cada empresa tiene un límite personalizado de peticiones por hora. El límite se resetea cada hora.
Las cabeceras de respuesta incluyen información sobre tu límite actual:

- \`RateLimit-Limit\`: Límite total de peticiones por hora
- \`RateLimit-Remaining\`: Peticiones restantes en esta ventana
- \`RateLimit-Reset\`: Timestamp cuando se resetea el límite

## Códigos de respuesta

- \`200\`: Operación exitosa
- \`400\`: Error en los parámetros de entrada
- \`401\`: API key faltante o inválida
- \`429\`: Límite de peticiones excedido
- \`500\`: Error del servidor o de Google APIs

Todas las respuestas incluyen un campo \`success\` (boolean) y, en caso de error, un campo \`error\` con la descripción.
      `,
      contact: {
        name: 'NextMove Team',
        email: 'eric.moreno@estudiantat.upc.edu'
      }
    },
    servers: [
      // {
      //   url: 'http://localhost:3000',
      //   description: 'Servidor de desarrollo'
      // },
      {
        url: 'http://bemotion.duckdns.org/:3001',
        description: 'Servidor de NextMove'
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
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key proporcionada por NextMove para autenticación de empresas'
        }
      },
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
                  description: 'Preferencia de enrutamiento. Solo funciona con DRIVE y TWO_WHEELER'
                },
                avoidTolls: {
                  type: 'boolean',
                  default: false,
                  description: 'Evitar carreteras de peaje'
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
              description: 'Polyline codificado de Google que representa la geometría de la ruta. Debe decodificarse con flutter_polyline_points o similar para pintar en el mapa.'
            },
            isEcoFriendly: {
              type: 'boolean',
              example: true,
              description: 'Indica si Google marcó esta ruta como eco-friendly (optimizada para menor consumo de combustible)'
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
              description: 'Lista de pasos de navegación turn-by-turn. Puede estar vacía si no se solicitaron.'
            },
            startLocation: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Coordenadas exactas del inicio de la ruta'
            },
            endLocation: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Coordenadas exactas del fin de la ruta'
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
              description: 'Indica si la ruta incluye carreteras de peaje'
            },
            estimatedTollPrice: {
              type: 'string',
              nullable: true,
              example: '5.50 EUR',
              description: 'Precio estimado de los peajes (cuando está disponible)'
            },
            fuelConsumption: {
              type: 'string',
              nullable: true,
              example: '8.5 L',
              description: 'Consumo estimado de combustible (cuando está disponible)'
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
              example: '0.5 km',
              description: 'Distancia del paso en formato legible'
            },
            distanceMeters: {
              type: 'integer',
              example: 500,
              description: 'Distancia del paso en metros'
            },
            duration: {
              type: 'string',
              example: '2min',
              description: 'Duración del paso en formato legible'
            },
            durationSeconds: {
              type: 'integer',
              example: 120,
              description: 'Duración del paso en segundos'
            },
            startLocation: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Coordenadas donde comienza este paso'
            },
            endLocation: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Coordenadas donde termina este paso'
            },
            polyline: {
              type: 'string',
              nullable: true,
              description: 'Polyline codificado específico para este paso'
            }
          }
        },
        Viewport: {
          type: 'object',
          description: 'Rectángulo que encierra toda la ruta. Útil para ajustar el zoom del mapa automáticamente.',
          properties: {
            low: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Esquina inferior izquierda (suroeste) del rectángulo'
            },
            high: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Esquina superior derecha (noreste) del rectángulo'
            }
          }
        },
        RouteResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Indica si la operación fue exitosa'
            },
            data: {
              type: 'object',
              properties: {
                routes: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Route'
                  },
                  description: 'Todas las rutas calculadas, ordenadas priorizando eco-friendly y luego por distancia'
                },
                recommendedRoute: {
                  $ref: '#/components/schemas/Route',
                  description: 'Ruta recomendada (prioriza eco-friendly, luego más corta)'
                },
                alternativeRoutesCount: {
                  type: 'integer',
                  example: 2,
                  description: 'Número de rutas alternativas disponibles'
                },
                ecoFriendlyOptionsCount: {
                  type: 'integer',
                  example: 1,
                  description: 'Número de rutas marcadas como eco-friendly'
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
              description: 'Dirección completa formateada por Google'
            },
            coordinates: {
              $ref: '#/components/schemas/Coordinates',
              description: 'Coordenadas GPS de la ubicación'
            },
            placeId: {
              type: 'string',
              example: 'ChIJz7H9NskUpRIRGfpJIiLRnQ8',
              description: 'Identificador único de Google Maps (Place ID)'
            },
            types: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['street_address', 'political'],
              description: 'Tipos de lugar según la clasificación de Google Maps'
            }
          }
        },
        LocationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Indica si la operación fue exitosa'
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Location'
              },
              description: 'Lista de ubicaciones encontradas. Puede contener múltiples resultados si la dirección es ambigua.'
            }
          }
        },
        ReverseGeocodeResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Indica si la operación fue exitosa'
            },
            data: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                  example: 'Plaça de la Independència, 17001 Girona, España',
                  description: 'Dirección formateada más cercana a las coordenadas'
                },
                coordinates: {
                  $ref: '#/components/schemas/Coordinates',
                  description: 'Coordenadas que se utilizaron para la búsqueda (eco de la petición)'
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Siempre false en respuestas de error'
            },
            error: {
              type: 'string',
              example: 'Se requieren origen y destino',
              description: 'Mensaje de error descriptivo'
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