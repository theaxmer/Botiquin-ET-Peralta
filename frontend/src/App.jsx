import { useState, useEffect } from 'react';
import Login from './Login';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [pestañaActiva, setPestañaActiva] = useState('sanidad'); 
  const [inventario, setInventario] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [militaresLista, setMilitaresLista] = useState([]);
  const [articulosBase, setArticulosBase] = useState([]); 

  const [mostrarModal, setMostrarModal] = useState(false);
  const [companiaSeleccionada, setCompaniaSeleccionada] = useState('');
  const [militarSeleccionado, setMilitarSeleccionado] = useState('');
  const [tipoRebaje, setTipoRebaje] = useState('Instrucción y Físico');
  const [motivoRebaje, setMotivoRebaje] = useState('');
  const [diasRevision, setDiasRevision] = useState(3);
  const [loteConsumir, setLoteConsumir] = useState('');

  const [mostrarModalStock, setMostrarModalStock] = useState(false);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState('');
  const [cantidadEntrante, setCantidadEntrante] = useState(1);
  const [fechaCaducidadEntrante, setFechaCaducidadEntrante] = useState('');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Token ${token}`
  };

  const authHeadersGet = {
    'Authorization': `Token ${token}`
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // 🔥 AQUÍ ESTABA EL ERROR PRINCIPAL: Faltaban las rutas exactas (/api/articulos/, etc.)
  const cargarDatos = () => {
    Promise.all([
      fetch('https://botiquin-backend.onrender.com/api/articulos/', { headers: authHeadersGet }).then(res => res.json()),
      fetch('https://botiquin-backend.onrender.com/api/lotes/', { headers: authHeadersGet }).then(res => res.json())
    ]).then(([articulosData, lotesData]) => {
      setArticulosBase(articulosData);
      const lotesCompletos = lotesData.map(lote => {
        const articulo = articulosData.find(a => a.id === lote.articulo) || {};
        return { ...lote, nombreArticulo: articulo.nombre || 'Sin nombre', codigoBarras: articulo.codigo_barras || '---' };
      });
      lotesCompletos.sort((a, b) => new Date(a.fecha_caducidad) - new Date(b.fecha_caducidad));
      setInventario(lotesCompletos);
    }).catch(error => console.error("Error inventario:", error));

    Promise.all([
      fetch('https://botiquin-backend.onrender.com/api/militares/', { headers: authHeadersGet }).then(res => res.json()),
      fetch('https://botiquin-backend.onrender.com/api/rebajes/', { headers: authHeadersGet }).then(res => res.json())
    ]).then(([militaresData, rebajesData]) => {
      setMilitaresLista(militaresData);
      const personalCompleto = militaresData.map(militar => {
        const rebajeActivo = rebajesData.find(r => r.militar === militar.id && r.activo === true);
        let textoTipos = "Sin Novedad";
        if (rebajeActivo) {
          if (rebajeActivo.baja_total) {
            textoTipos = "BAJA TOTAL";
          } else {
            let tipos = [];
            if (rebajeActivo.rebaje_deporte) tipos.push("Deporte");
            if (rebajeActivo.rebaje_botas) tipos.push("Botas"); 
            if (rebajeActivo.rebaje_instruccion) tipos.push("Instrucción");
            if (rebajeActivo.rebaje_orden_cerrado) tipos.push("Orden Cerrado");
            textoTipos = tipos.length > 0 ? "Rebajado de: " + tipos.join(", ") : "Rebaje Parcial";
          }
        }
        return { 
          ...militar, 
          estado: rebajeActivo ? 'REBAJADO' : 'APTO', 
          textoRebaje: textoTipos,
          observaciones: rebajeActivo ? rebajeActivo.observaciones : '',
          fechaRevision: rebajeActivo ? rebajeActivo.fecha_revision : null,
          rebajeId: rebajeActivo ? rebajeActivo.id : null 
        };
      });
      setPacientes(personalCompleto);
    }).catch(error => console.error("Error personal:", error));
  };

  useEffect(() => {
    if (token) {
      cargarDatos();
    }
  }, [token]);

  // 🔥 RUTA CORREGIDA: /api/rebajes/${rebajeId}/
  const eliminarRebaje = async (rebajeId) => {
    if (!rebajeId) return;
    if (window.confirm("¿Estás seguro de dar de alta a este militar?")) {
      try {
        const response = await fetch(`https://botiquin-backend.onrender.com/api/rebajes/${rebajeId}/`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ activo: false })
        });
        if (response.ok) {
          alert("¡Alta médica registrada correctamente!");
          cargarDatos(); 
        } else {
          alert("ERROR DE DJANGO al dar de alta.");
        }
      } catch (err) {
        alert("ERROR CRÍTICO: Sin conexión.");
      }
    }
  };

  const guardarAsistencia = async (e) => {
    e.preventDefault();
    if (!militarSeleccionado || !motivoRebaje) {
      alert("⚠️ Debes seleccionar un militar e indicar el diagnóstico.");
      return;
    }
    const hoyObj = new Date();
    const fechaRevObj = new Date();
    fechaRevObj.setDate(hoyObj.getDate() + parseInt(diasRevision));
    const fechaRevisionStr = fechaRevObj.toISOString().split('T')[0];

    let bTotal = false, rDeporte = false, rBotas = false, rInst = false, rOrden = false;
    let esActivo = true; 

    if (tipoRebaje === 'Baja Temporal / En Cama') {
      bTotal = true;
    } else if (tipoRebaje === 'Calzado Militar') {
      rBotas = true;
    } else if (tipoRebaje === 'Instrucción y Físico') {
      rInst = true; rDeporte = true; rOrden = true;
    } else if (tipoRebaje === 'Atención Sin Rebaje') {
      esActivo = false; 
    }

    const datosPeticion = {
      militar: parseInt(militarSeleccionado),
      baja_total: bTotal,
      rebaje_deporte: rDeporte,
      rebaje_botas: rBotas,
      rebaje_instruccion: rInst,
      rebaje_orden_cerrado: rOrden,
      fecha_revision: fechaRevisionStr, 
      observaciones: motivoRebaje,      
      activo: esActivo
    };

    try {
      // 🔥 RUTA CORREGIDA: /api/rebajes/
      const resRebaje = await fetch('https://botiquin-backend.onrender.com/api/rebajes/', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(datosPeticion)
      });

      if (!resRebaje.ok) return alert("Error al guardar asistencia.");

      if (loteConsumir) {
        const loteActual = inventario.find(l => l.id === parseInt(loteConsumir));
        if (loteActual && loteActual.cantidad > 0) {
          // 🔥 RUTA CORREGIDA: /api/lotes/${loteConsumir}/
          await fetch(`https://botiquin-backend.onrender.com/api/lotes/${loteConsumir}/`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ cantidad: loteActual.cantidad - 1 })
          });
        }
      }

      setMostrarModal(false);
      setCompaniaSeleccionada('');
      setMilitarSeleccionado('');
      setTipoRebaje('Instrucción y Físico');
      setMotivoRebaje('');
      setDiasRevision(3);
      setLoteConsumir('');
      cargarDatos(); 
      alert("Asistencia registrada con éxito.");
    } catch (error) {
      alert("Error crítico de conexión.");
    }
  };

  // 🔥 RUTA CORREGIDA: /api/lotes/${loteId}/
  const eliminarLote = async (loteId) => {
    if (!loteId) return;
    if (window.confirm("¿Estás seguro de eliminar este lote de material del inventario?")) {
      try {
        const response = await fetch(`https://botiquin-backend.onrender.com/api/lotes/${loteId}/`, { 
          method: 'DELETE',
          headers: authHeadersGet 
        });
        if (response.ok) {
          alert("¡Lote eliminado correctamente!");
          cargarDatos();
        } else {
          alert("ERROR DE DJANGO al borrar lote.");
        }
      } catch (err) {
        alert("ERROR CRÍTICO: Sin conexión.");
      }
    }
  };

  // 🔥 RUTA CORREGIDA: /api/lotes/${lote.id}/
  const modificarCantidad = (lote, cambio) => {
    const nuevaCantidad = lote.cantidad + cambio;
    if (nuevaCantidad < 0) return alert("⚠️ Cantidad no puede ser menor a 0.");
    fetch(`https://botiquin-backend.onrender.com/api/lotes/${lote.id}/`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ cantidad: nuevaCantidad }),
    }).then(res => { if(res.ok) cargarDatos(); });
  };

  const guardarNuevoLote = async (e) => {
    e.preventDefault();
    if (!articuloSeleccionado || cantidadEntrante <= 0) {
      alert("Selecciona un medicamento e introduce una cantidad válida.");
      return;
    }
    const datosLote = {
      articulo: parseInt(articuloSeleccionado),
      cantidad: parseInt(cantidadEntrante),
      fecha_caducidad: fechaCaducidadEntrante ? fechaCaducidadEntrante : null
    };

    try {
      // 🔥 RUTA CORREGIDA: /api/lotes/
      const res = await fetch('https://botiquin-backend.onrender.com/api/lotes/', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(datosLote)
      });

      if (res.ok) {
        alert("Entrada de material registrada en el almacén.");
        setMostrarModalStock(false);
        setArticuloSeleccionado('');
        setCantidadEntrante(1);
        setFechaCaducidadEntrante('');
        cargarDatos();
      } else {
        alert("Error al registrar el material.");
      }
    } catch (error) {
      alert("Error crítico de conexión.");
    }
  };

  const evaluarCaducidad = (fechaStr) => {
    if (!fechaStr) return { texto: 'Sin caducidad', estilo: 'bg-slate-100 text-slate-600 border-slate-200' };
    const mesesRestantes = (new Date(fechaStr) - new Date()) / (1000 * 60 * 60 * 24 * 30);
    if (mesesRestantes < 0) return { texto: '¡CADUCADO!', estilo: 'bg-red-100 text-red-800 border-red-300 animate-pulse' };
    else if (mesesRestantes <= 2) return { texto: 'Próximo a caducar', estilo: 'bg-orange-100 text-orange-800 border-orange-300' };
    else return { texto: 'Operativo', estilo: 'bg-green-100 text-green-800 border-green-300' };
  };

  if (!token) {
    return <Login onLogin={setToken} />;
  }

  const pacientesRebajados = pacientes.filter(p => p.estado === 'REBAJADO');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <header className="bg-slate-900 text-white shadow-md border-b-4 border-green-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-wider">✚ BOTIQUÍN DIGITAL ET</h1>
          <button onClick={handleLogout} className="bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 shadow">
            <span>🚪</span> Cerrar Sesión
          </button>
        </div>
        <div className="container mx-auto px-4 flex gap-4 mt-2">
          <button onClick={() => setPestañaActiva('sanidad')} className={`py-3 px-6 font-bold text-sm uppercase tracking-wide rounded-t-lg transition ${pestañaActiva === 'sanidad' ? 'bg-slate-100 text-slate-900 border-t-2 border-l-2 border-r-2 border-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            Novedades Médicas
          </button>
          <button onClick={() => setPestañaActiva('inventario')} className={`py-3 px-6 font-bold text-sm uppercase tracking-wide rounded-t-lg transition ${pestañaActiva === 'inventario' ? 'bg-slate-100 text-slate-900 border-t-2 border-l-2 border-r-2 border-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            Logística (Inventario)
          </button>
        </div>
      </header>

      <main className="container mx-auto p-4 mt-4 max-w-6xl">
        {pestañaActiva === 'sanidad' && (
          <div className="bg-white rounded-b-lg rounded-tr-lg shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Personal Rebajado (Novedades)</h2>
              <button onClick={() => setMostrarModal(true)} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded shadow text-sm font-bold transition flex items-center gap-2">
                <span>+</span> Registrar Nueva Asistencia
              </button>
            </div>
            <div className="p-6">
              {pacientesRebajados.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-300 text-sm uppercase text-slate-500 bg-slate-50">
                        <th className="py-3 px-4">CIA</th>
                        <th className="py-3 px-4">Empleo y Nombre</th>
                        <th className="py-3 px-4 text-center">Estado</th>
                        <th className="py-3 px-4 text-left">Novedad Médica</th>
                        <th className="py-3 px-4 text-center">Fecha Revisión</th>
                        <th className="py-3 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pacientesRebajados.map((militar, index) => (
                        <tr key={militar.id} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <td className="py-3 px-4 font-bold text-blue-800">{militar.compania || '---'}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{militar.empleo} {militar.nombre} {militar.apellidos}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-red-100 text-red-800 py-1 px-3 rounded-full text-xs font-bold border border-red-300 animate-pulse">REBAJADO</span>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">
                            <span className="block font-bold text-slate-900">{militar.textoRebaje}</span>
                            <span className="block text-slate-500 italic mt-0.5">{militar.observaciones}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-sm font-bold text-slate-600">
                            {militar.fechaRevision ? militar.fechaRevision.split("-").reverse().join("/") : '---'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => eliminarRebaje(militar.rebajeId)} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded text-xs font-bold transition cursor-pointer" title="Dar de alta">
                              Dar Alta
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded bg-slate-50">
                  <span className="text-3xl block mb-2">✅</span>
                  <p className="font-bold text-lg text-slate-600">Sin Novedades Médicas</p>
                  <p className="text-sm">Todo el personal se encuentra APTO para el servicio.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {pestañaActiva === 'inventario' && (
          <div className="bg-white rounded-b-lg rounded-tl-lg shadow-lg border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Control de Almacén</h2>
                <button onClick={() => setMostrarModalStock(true)} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded shadow text-sm font-bold transition flex items-center gap-2">
                  <span>+</span> Añadir Entrada de Material
                </button>
             </div>
             <div className="p-6">
               <div className="overflow-x-auto">
                 <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-300 text-sm uppercase tracking-wide text-slate-500 bg-slate-50">
                        <th className="py-3 px-4">Código de Barras</th>
                        <th className="py-3 px-4">Descripción del Artículo</th>
                        <th className="py-3 px-4 text-center">Stock</th>
                        <th className="py-3 px-4 text-center">Estado Sanitario</th>
                        <th className="py-3 px-4 text-center">Consumo Rápido</th>
                        <th className="py-3 px-4 text-center">Borrar</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {inventario.map((lote, index) => {
                        const caducidad = evaluarCaducidad(lote.fecha_caducidad);
                        return (
                          <tr key={lote.id} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                            <td className="py-3 px-4 font-mono font-medium text-slate-500">{lote.codigoBarras}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{lote.nombreArticulo}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-3 py-1 rounded-full font-bold text-sm ${lote.cantidad === 0 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>{lote.cantidad} uds</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`py-1 px-3 rounded-full text-xs font-bold border ${caducidad.estilo}`}>{caducidad.texto}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex rounded-md shadow-sm">
                                <button onClick={() => modificarCantidad(lote, -2)} className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-l-lg transition">-2</button>
                                <button onClick={() => modificarCantidad(lote, -1)} className="px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border-t border-b border-orange-200 transition">-1</button>
                                <button onClick={() => modificarCantidad(lote, 1)} className="px-2.5 py-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-r-lg transition">+1</button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button onClick={() => eliminarLote(lote.id)} className="text-slate-400 hover:text-red-600 transition font-bold px-2 py-1" title="Eliminar este lote">🗑️</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
               </div>
             </div>
          </div>
        )}
      </main>

      {/* MODALES DEJAN IGUAL */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b-2 border-blue-600">
              <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                <span>🩺</span> Registro de Asistencia Sanitaria
              </h3>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>
            <form onSubmit={guardarAsistencia} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Compañía *</label>
                <select value={companiaSeleccionada} onChange={(e) => { setCompaniaSeleccionada(e.target.value); setMilitarSeleccionado(''); }} className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required>
                  <option value="">-- Seleccionar Compañía --</option>
                  <option value="1ºCIA">1ª Compañía</option>
                  <option value="2ºCIA">2ª Compañía</option>
                  <option value="3ºCIA">3ª Compañía</option>
                  <option value="4ºCIA">4ª Compañía</option>
                  <option value="5ºCIA">5ª Compañía</option>
                  <option value="PLANA">Plana Mayor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Militar Atendido *</label>
                <select value={militarSeleccionado} onChange={(e) => setMilitarSeleccionado(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50" required disabled={!companiaSeleccionada}>
                  <option value="">-- Seleccionar Paciente --</option>
                  {militaresLista.filter(m => m.compania === companiaSeleccionada).map(m => (
                    <option key={m.id} value={m.id}>{m.empleo} {m.nombre} {m.apellidos}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Intervención *</label>
                <select value={tipoRebaje} onChange={(e) => setTipoRebaje(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800">
                  <option value="Instrucción y Físico">Rebaje de Instrucción y Físico</option>
                  <option value="Calzado Militar">Rebaje de Botas</option>
                  <option value="Baja Temporal / En Cama">BAJA TOTAL</option>
                  <option value="Atención Sin Rebaje">Solo atención</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Diagnóstico / Observaciones *</label>
                <textarea value={motivoRebaje} onChange={(e) => setMotivoRebaje(e.target.value)} placeholder="Ej: Esguince leve de tobillo." className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none h-20" required />
              </div>
              {tipoRebaje !== 'Atención Sin Rebaje' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Revisión en (Días) *</label>
                  <select value={diasRevision} onChange={(e) => setDiasRevision(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(dia => (
                      <option key={dia} value={dia}>{dia} {dia === 1 ? 'Día (Mañana)' : 'Días'}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Suministrar Material (Descuenta 1 ud)</label>
                <select value={loteConsumir} onChange={(e) => setLoteConsumir(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700">
                  <option value="">-- Ninguno / Solo diagnóstico --</option>
                  {inventario.filter(l => l.cantidad > 0).map(l => (
                    <option key={l.id} value={l.id}>{l.nombreArticulo} (Stock: {l.cantidad} uds)</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-6">
                <button type="button" onClick={() => setMostrarModal(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded shadow transition">Guardar Asistencia</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalStock && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b-2 border-green-500">
              <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                <span>📦</span> Registro de Entrada de Material
              </h3>
              <button onClick={() => setMostrarModalStock(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>
            
            <form onSubmit={guardarNuevoLote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Seleccionar Artículo de la Base de Datos *</label>
                <select value={articuloSeleccionado} onChange={(e) => setArticuloSeleccionado(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none" required>
                  <option value="">-- Buscar en el catálogo --</option>
                  {articulosBase.map(art => (
                    <option key={art.id} value={art.id}>
                      {art.codigo_barras} - {art.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Cantidad Entrante *</label>
                  <input 
                    type="number" 
                    min="1"
                    value={cantidadEntrante} 
                    onChange={(e) => setCantidadEntrante(e.target.value)} 
                    className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none font-bold" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fecha de Caducidad (Opcional)</label>
                  <input 
                    type="date" 
                    value={fechaCaducidadEntrante} 
                    onChange={(e) => setFechaCaducidadEntrante(e.target.value)} 
                    className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none" 
                  />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3 rounded mt-2 flex gap-2">
                <span className="font-bold">ℹ️</span>
                <p>Al guardar, el sistema generará un nuevo lote con esta cantidad y caducidad, y se mostrará automáticamente en el Control de Almacén.</p>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-6">
                <button type="button" onClick={() => setMostrarModalStock(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-green-700 hover:bg-green-800 rounded shadow transition">Guardar Entrada</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;