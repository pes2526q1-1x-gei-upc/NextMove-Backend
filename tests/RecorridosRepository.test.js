import { mergeConfig } from 'axios';
import { applyDatabaseMock, mockQuery } from './helpers/databaseMock.js';
await applyDatabaseMock();
const { default: RecorridosRepository } = await import('../src/repositories/RecorridosRepository.js');

// Datos reutilizables para los tests
const mockInput = {
  user_email: 'user@example.com',
  distancia: 1200,
  velocidad_media: 10.5,
  co2: 0,
  kcal: 45,
  origen: { latitude: 41.38, longitude: 2.17 },
  destino: { latitude: 41.39, longitude: 2.18 },
  fecha_recorrido: '2025-11-21'
};


//Simula una fila de la BD, coordenadas en formato POINT
const mockDbRow = {
  id: 101,
  user_email: mockInput.user_email,
  distancia: mockInput.distancia,
  velocidad_media: mockInput.velocidad_media,
  co2: mockInput.co2,
  kcal: mockInput.kcal,
  origen: { x: mockInput.origen.longitude, y: mockInput.origen.latitude },
  destino: { x: mockInput.destino.longitude, y: mockInput.destino.latitude },
  fecha_recorrido: mockInput.fecha_recorrido
};

//Hacemos que se reseteé con el valor inicial nuestro mockup generado préviamente. 
describe('RecorridosRepository - CRUD (mocked pool)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });


  test('getAllRecorridos: transforma correctamente puntos Postgres a {latitude, longitude} aptos para GraphQL', async () => {
    //La QUERY simulada es: SELECT * FROM recorridos:
    mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
    const repo = new RecorridosRepository();
    const res = await repo.getAllRecorridos();

    //Comprobamos que la query realiza correctamente la llamada a la BD. 
    expect(mockQuery).toHaveBeenCalled();
    expect(res).toHaveLength(1);
    //analizamos si realmente se transforma de forma correcta las coordenadas del recorrido
    expect(res[0].origen).toEqual({ latitude: 41.38, longitude: 2.17 });
    expect(res[0].destino).toEqual({ latitude: 41.39, longitude: 2.18 });
  });


  test('getRecorridoById: retorna null si no existe', async () => {
    //La respuesta que esperamos tener es 0 filas, por eso rows[]
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const repo = new RecorridosRepository();
    const res = await repo.getRecorridoById(9999);
    expect(res).toBeNull();
    expect(mockQuery).toHaveBeenCalled();
  }); 


  test('getRecorridoById: transforma correctamente un recorrido existente', async () => {
    mockQuery.mockResolvedValueOnce({rows: [mockDbRow]});
    const repo = new RecorridosRepository(); 
    //llamamos para obtener un recorrdio inexistente en el sistema: 
    const res = await repo.getRecorridoById(1); 
    //verificamos que realmente obtenemos la estación con id = 101 y que la info transformada es correcta.
    expect(res).not.toBeNull(); 
    expect(res.id).toBe(101); 
    expect(res.origen).toEqual({latitude: 41.38, longitude: 2.17}); 
    expect(res.destino).toEqual({latitude: 41.39, longitude: 2.18}); 
  });  


  test('getRecorrdiosByUser: retorna una lista transformada', async () => {
    const anotherRow = { ...mockDbRow, id: 102 }; 
    mockQuery.mockResolvedValueOnce({rows: [mockDbRow, anotherRow]}); 
    const repo = new RecorridosRepository(); 
    const email = mockInput.user_email; 
    const res = await repo.getRecorridosByUser(email); 
    expect(res).toHaveLength(2); 
    expect(res[1].id).toBe(102); 
  }); 


  test('saveRecorrido: llama a pool.query con POINTs correctamente formateados y retorna el objeto transformado', async() => {
    mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] }); 
    const repo = new RecorridosRepository(); 
    const res = await repo.saveRecorrido(mockInput); 

    //aseguramos que se llamada una vez al metodo insert de la BD: 
    expect(mockQuery).toHaveBeenCalledTimes(1); 
    const callArgs = mockQuery.mock.calls[0]; //contiene el registro de todas las llamadas.
    const params = callArgs[1]; 
    //sabemos que el 5 y 6 parámetro corresponde a origen y destino en la relación de BD: verificamos que estan formateados.
    expect(params[5]).toBe(`(${mockInput.origen.longitude}, ${mockInput.origen.latitude})`);
    expect(params[6]).toBe(`(${mockInput.destino.longitude}, ${mockInput.destino.latitude})`);

    //ahora verificamos que los valores obtenidos de BD son correctamente formateados: 
    expect(res.origen).toEqual({latitude: 41.38 , longitude: 2.17}); 
    expect(res.destino).toEqual({latitude: 41.39, longitude: 2.18}); 
  });
  

  test('updateRecorrido: obtiene recorrido existente, actualiza y verifica valores y llamadas', async () => {
    // Usamos el mockDbRow definido al principio como la fila existente
    const existingRow = { ...mockDbRow };

    // Construimos la fila actualizada a partir de existingRow
    const updatedRow = { ...existingRow, distancia: 2000, origen: { x: 2.0, y: 41.0 } };

    // Configuramos mock: primera llamada -> SELECT (getRecorridoById), segunda -> UPDATE
    mockQuery
    .mockResolvedValueOnce({ rows: [existingRow] }) //Resultado de la llamada al getRecorridosById. 
    .mockResolvedValueOnce({ rows: [updatedRow] }); //Resultado de UPDATE. 

    const repo = new RecorridosRepository();

    // Comprobamos el estado actual obtenido desde la "BD" mockeada
    const before = await repo.getRecorridoById(existingRow.id);
    expect(before).not.toBeNull();
    expect(before.distancia).toBe(existingRow.distancia);
    expect(before.origen).toEqual({ latitude: existingRow.origen.y, longitude: existingRow.origen.x });

    // Llamamos a updateRecorrido con los nuevos datos (solo los campos que queremos cambiar)
    const newData = { distancia: 2000, origen: { latitude: 41.0, longitude: 2.0 } };
    const result = await repo.updateRecorrido(existingRow.id, newData);

    // Verificaciones sobre el resultado transformado
    expect(result).not.toBeNull();
    expect(result.distancia).toBe(2000);
    expect(result.origen).toEqual({ latitude: 41.0, longitude: 2.0 });

    // Verificaciones sobre las llamadas a la BD, que el orden explícitado préviamente sea el correcto. 
    const firstCall = mockQuery.mock.calls[0];
    expect(firstCall[0].toUpperCase()).toContain('SELECT'); //convertimos todo a mayus. para evitar conflictos.

    const secondCall = mockQuery.mock.calls[1];
    expect(secondCall[0].toUpperCase()).toContain('UPDATE RECORRIDOS'); //Ídem. 
  });
      

  test('deleteRecorrido: devuelve true si rowCount > 0, false si 0', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const repo = new RecorridosRepository();
    const ok = await repo.deleteRecorrido(mockDbRow.id);
    expect(ok).toBe(true);

    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    const notOk = await repo.deleteRecorrido(9999);
    expect(notOk).toBe(false);
  });

  // Casos extermos método saveRecorrido() Repositorio:
   
  // TEST PARAMETRIZADO: comprobar que para cada campo NOT NULL, si enviamos null la inserción se rechaza con un error de constraint (simulamos code '23502').
  test.each([
    'user_email',
    'distancia',
    'velocidad_media',
    'co2',
    'kcal',
    'origen',
    'destino',
    'fecha_recorrido'
  ])('saveRecorrido: rechaza cuando %s es null (NOT NULL)', async (campo) => {
    const input = { ...mockInput };
    input[campo] = null;

    const dbErr = new Error(`null value in column "${campo}" violates not-null constraint`);
    dbErr.code = '23502';
    mockQuery.mockRejectedValueOnce(dbErr);

    const repo = new RecorridosRepository();
    await expect(repo.saveRecorrido(input)).rejects.toMatchObject({ code: '23502' });
  });

  
  test('saveRecorrido: mapea error 23514 a mensaje legible (valores negativos)', async () => {
    const dbErr = Object.assign(new Error('check constraint'), { code: '23514' });
    mockQuery.mockRejectedValueOnce(dbErr);

    const repo = new RecorridosRepository();
    await expect(repo.saveRecorrido({ ...mockInput, distancia: -10 })).rejects.toThrow();
  });


  test('saveRecorrido: mapea error 22P02 a mensaje legible (tipo incorrecto)', async () => {
    const dbErr = Object.assign(new Error('invalid input syntax'), { code: '22P02' });
    mockQuery.mockRejectedValueOnce(dbErr);

    const repo = new RecorridosRepository();
    await expect(repo.saveRecorrido({ ...mockInput, distancia: 'not-a-number' })).rejects.toThrow();
  });

  
  test('saveRecorrido: propaga errores de la base de datos', async () => {
    const repo = new RecorridosRepository();
    mockQuery.mockRejectedValueOnce(new Error('DB fail'));
    await expect(repo.saveRecorrido(mockInput)).rejects.toThrow('DB fail');
  });


  // Casos extremos método updateRecorrido Repositorio: 

  test('updateRecorrido: objeto vacío retorna el mismo recorrido (sin UPDATE)', async () => {
    const existingRow = { ...mockDbRow };
    // Solo SELECT debe ser llamado y se debe devolver el recorrido tal cual
    mockQuery.mockResolvedValueOnce({ rows: [existingRow] });

    const repo = new RecorridosRepository();
    const res = await repo.updateRecorrido(existingRow.id, {});

    expect(res).not.toBeNull();
    expect(res.id).toBe(existingRow.id);
    expect(res.origen).toEqual({ latitude: existingRow.origen.y, longitude: existingRow.origen.x });
    // Sólo la llamada al SELECT inicial
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });


  test('updateRecorrido: mapea error 23514 a mensaje legible (valores negativos en distancia)', async () => {
    const existingRow = { ...mockDbRow };
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('check constraint'), { code: '23514' }));

    const repo = new RecorridosRepository();
    await expect(repo.updateRecorrido(existingRow.id, { distancia: -100 })).rejects.toThrow();
  });

    
  test('updateRecorrido: mapea error 23514 a mensaje legible (valores negativos en co2)', async () => {
    const existingRow = { ...mockDbRow };
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('check constraint'), { code: '23514' }));

    const repo = new RecorridosRepository();
    await expect(repo.updateRecorrido(existingRow.id, { co2: -100 })).rejects.toThrow();
  });


  test('updateRecorrido: mapea error 23514 a mensaje legible (valores negativos en kcal)', async () => {
    const existingRow = { ...mockDbRow };
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('check constraint'), { code: '23514' }));

    const repo = new RecorridosRepository();
    await expect(repo.updateRecorrido(existingRow.id, { kcal: -100 })).rejects.toThrow();
  });


  test('updateRecorrido: mapea error 22P02 a mensaje legible (tipo incorrecto en campo distancia)', async () => {
      const existingRow = { ...mockDbRow };
      mockQuery.mockRejectedValueOnce(Object.assign(new Error('invalid input syntax'), { code: '22P02' }));
      
      const repo = new RecorridosRepository();
      await expect(repo.updateRecorrido(existingRow.id, { distancia: 'no_soy_un_número' })).rejects.toThrow();
  });
     
   test('updateRecorrido: mapea error 22P02 a mensaje legible (tipo incorrecto en campo co2)', async () => {
      const existingRow = { ...mockDbRow };
      mockQuery.mockRejectedValueOnce(Object.assign(new Error('invalid input syntax'), { code: '22P02' }));
      
      const repo = new RecorridosRepository();
      await expect(repo.updateRecorrido(existingRow.id, { co2: 'no_soy_un_número' })).rejects.toThrow();
  });

  test('updateRecorrido: mapea error 22P02 a mensaje legible (tipo incorrecto en campo kcal)', async () => {
    const existingRow = { ...mockDbRow };
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('invalid input syntax'), { code: '22P02' }));
      
    const repo = new RecorridosRepository();
    await expect(repo.updateRecorrido(existingRow.id, { co2: 'no_soy_un_número' })).rejects.toThrow();
  });

  
  test('updateRecorrido: mapea error 22P02 a mensaje legible (tipo incorrecto en campo origen)', async () => {
    const existingRow = { ...mockDbRow };
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('invalid input syntax'), { code: '22P02' }));
      
    const repo = new RecorridosRepository();
    await expect(repo.updateRecorrido(existingRow.id, { origen: 'no_soy_una_coordenada' })).rejects.toThrow();
  });

  
  test('updateRecorrido: mapea error 22P02 a mensaje legible (tipo incorrecto en campo destino)', async () => {
    const existingRow = { ...mockDbRow };
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('invalid input syntax'), { code: '22P02' }));
      
    const repo = new RecorridosRepository();
    await expect(repo.updateRecorrido(existingRow.id, { origen: 'no_soy_una_coordenada' })).rejects.toThrow();
  });

});
