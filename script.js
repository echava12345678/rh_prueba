// script.js
// Importa las funciones necesarias del SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Variables globales para almacenar datos
let tramites = [];
let registrosContables = [];
let clientesCRM = [];
let placas = [];

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDEpK5nihXlRYhelf10c_AZmDl0EiffiWI",
    authDomain: "rhasesorias-47ec0.firebaseapp.com",
    projectId: "rhasesorias-47ec0",
    storageBucket: "rhasesorias-47ec0.firebasestorage.app",
    messagingSenderId: "428666997954",
    appId: "1:428666997954:web:2bacad995bf0ae999eff5b",
    measurementId: "G-TJW55F5KKY"
};

// **INICIALIZA FIREBASE UNA SOLA VEZ DE FORMA GLOBAL**
// Estas variables (app, db, auth) estarán disponibles para todas las funciones.
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Espera a que la página se cargue
document.addEventListener('DOMContentLoaded', function() {
    
    // Configura los formularios y botones
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', (e) => handleLogin(e, auth));
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => handleLogout(auth));

    // **NUEVO: Asigna oyentes de eventos a los botones de navegación**
    document.getElementById('btnTramites').addEventListener('click', () => showSection('tramites'));
    document.getElementById('btnContabilidad').addEventListener('click', () => showSection('contabilidad'));
    document.getElementById('btnCRM').addEventListener('click', () => showSection('crm'));
    document.getElementById('btnPlacas').addEventListener('click', () => showSection('placas'));

    // Ocultar/mostrar la interfaz de la aplicación según el estado de autenticación
    onAuthStateChanged(auth, (user) => {
        const loginPanel = document.getElementById('loginPanel');
        const appContainer = document.getElementById('appContainer');
         const tramiteClienteInput = document.getElementById('tramiteCliente');
        const tramiteNitInput = document.getElementById('tramiteNit'); // ID corregido

        if (tramiteClienteInput && tramiteNitInput) {
            // El evento 'blur' se dispara cuando el usuario sale del campo
            tramiteClienteInput.addEventListener('blur', () => {
                const nombreCliente = tramiteClienteInput.value.trim().toLowerCase();
                
                // Busca el cliente usando una coincidencia parcial para mayor flexibilidad
                const clienteEncontrado = clientesCRM.find(c => 
                    c.cliente.trim().toLowerCase().includes(nombreCliente)
                );
                
                if (clienteEncontrado) {
                    // Si se encuentra una coincidencia, rellena el campo de cédula/NIT
                    tramiteNitInput.value = clienteEncontrado.cedula;
                } else {
                    // Si no se encuentra, limpia el campo para evitar datos incorrectos
                    tramiteNitInput.value = '';
                }
            });
        }

        if (user) {
            // El usuario ha iniciado sesión
            loginPanel.style.display = 'none';
            appContainer.style.display = 'block';

            // Cargar datos de Firestore en tiempo real usando onSnapshot
            onSnapshot(collection(db, 'tramites'), (snapshot) => {
                tramites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                actualizarTramites();
            });

            onSnapshot(collection(db, 'registrosContables'), (snapshot) => {
                registrosContables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                actualizarRegistrosContables();
            });

            onSnapshot(collection(db, 'clientesCRM'), (snapshot) => {
                clientesCRM = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                actualizarTablaCRM();
            const tramiteClienteInput = document.getElementById('tramiteCliente');
                const tramiteNitInput = document.getElementById('tramiteNit'); 
                
                if (tramiteClienteInput && tramiteNitInput) {
                    tramiteClienteInput.addEventListener('blur', () => {
                        const nombreCliente = tramiteClienteInput.value.trim().toLowerCase();
                        
                        const clienteEncontrado = clientesCRM.find(c => 
                            c.cliente.trim().toLowerCase().includes(nombreCliente)
                        );
                        
                        if (clienteEncontrado) {
                            // Rellenar el campo con la cédula del cliente encontrado
                            tramiteNitInput.value = clienteEncontrado.cedula;
                        } else {
                            tramiteNitInput.value = '';
                        }
                    });
                }
            });

            onSnapshot(collection(db, 'placas'), (snapshot) => {
                placas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                actualizarTablaPlacas();
                // Nuevo: Actualizar también la tabla de placas en la sección de contabilidad
                actualizarTablaPlacasContabilidad(); 
            });

            // Configura la fecha actual por defecto en los campos de fecha
            const today = new Date().toISOString().split('T')[0];
            const tramiteFecha = document.getElementById('tramiteFecha');
            if (tramiteFecha) tramiteFecha.value = today;
            const contaFecha = document.getElementById('contaFecha');
            if (contaFecha) contaFecha.value = today;
            const placaFechaRecepcion = document.getElementById('placaFechaRecepcion');
            if (placaFechaRecepcion) placaFechaRecepcion.value = today;
            const fechaConsulta = document.getElementById('fechaConsulta');
            if (fechaConsulta) fechaConsulta.value = today;
            
            // Event listeners para los formularios
            const tramiteForm = document.getElementById('tramiteForm');
            if (tramiteForm) tramiteForm.addEventListener('submit', (e) => agregarTramite(e, db));
            const contabilidadForm = document.getElementById('contabilidadForm');
            if (contabilidadForm) contabilidadForm.addEventListener('submit', (e) => agregarMovimiento(e, db));
            const crmForm = document.getElementById('crmForm');
            if (crmForm) crmForm.addEventListener('submit', (e) => agregarClienteCRM(e, db));
            const placasForm = document.getElementById('placasForm');
            if (placasForm) placasForm.addEventListener('submit', (e) => registrarPlaca(e, db));
            
            
            // Configura el modal de edición
            const modal = document.getElementById('editModal');
            const closeBtn = document.querySelector('.close');
            if (closeBtn) closeBtn.onclick = function() { modal.style.display = 'none'; }
            window.onclick = function(event) {
                if (event.target === modal) modal.style.display = 'none';
            }
            
            // Verificar vencimientos al cargar la página y luego cada hora
            verificarVencimientos(db);
            setInterval(() => verificarVencimientos(db), 3600000);

            // Muestra la sección inicial
            showSection('tramites');

        } else {
            // El usuario ha cerrado sesión o no ha iniciado sesión
            loginPanel.style.display = 'block';
            appContainer.style.display = 'none';
        }
        
    });
});
 // --- Nuevos event listeners para los buscadores ---
      const tramitesSearchInput = document.getElementById('tramiteSearchInput');
if (tramitesSearchInput) {
    tramitesSearchInput.addEventListener('keyup', (e) => filtrarTramites(e.target.value));
}

const contaSearchInput = document.getElementById('contaSearchInput');
if (contaSearchInput) {
    contaSearchInput.addEventListener('keyup', (e) => filtrarRegistros(e.target.value));
}
const contaSearchButton = document.getElementById('contaSearchButton');
if (contaSearchButton) {
    contaSearchButton.addEventListener('click', () => {
        const searchTerm = document.getElementById('contaSearchInput').value;
        filtrarRegistros(searchTerm);
    });
}
        
const crmSearchInput = document.getElementById('crmSearchInput');
if (crmSearchInput) {
    crmSearchInput.addEventListener('keyup', (e) => filtrarClientes(e.target.value));
}
        
const placaSearchInput = document.getElementById('placaSearchInput');
if (placaSearchInput) {
    placaSearchInput.addEventListener('keyup', (e) => filtrarPlacas(e.target.value));
}
// NUEVO: Buscador de placas en la sección de contabilidad
const contaPlacaSearchInput = document.getElementById('contaPlacaSearchInput');
if (contaPlacaSearchInput) {
    contaPlacaSearchInput.addEventListener('keyup', (e) => filtrarPlacasContabilidad(e.target.value));
}

// --- FUNCIONES DE BÚSQUEDA ---
function filtrarTramites(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    // Si el término de búsqueda está vacío, restaura la vista completa
    if (term === '') {
        actualizarTramites();
        return;
    }
    const resultados = tramites.filter(t => 
        (t.cliente && t.cliente.toLowerCase().includes(term)) ||
        (t.placa && t.placa.toLowerCase().includes(term)) ||
        (t.nit && t.nit.toLowerCase().includes(term)) ||
        (t.tipo && t.tipo.toLowerCase().includes(term))
    );
    // Limpia todas las secciones antes de mostrar los resultados
    document.getElementById('tramitesPorCobrar').innerHTML = '';
    document.getElementById('tramitesProceso').innerHTML = '';
    document.getElementById('tramitesTerminados').innerHTML = '';
    document.getElementById('tramitesRechazados').innerHTML = '';

    // Ahora, clasifica y renderiza los resultados en su contenedor correcto
    const porCobrar = resultados.filter(t => t.estado === 'terminado' && t.pago === 'pendiente');
    const proceso = resultados.filter(t => t.estado === 'proceso');
    const terminados = resultados.filter(t => t.estado === 'terminado' && t.pago === 'pagado');
    const rechazados = resultados.filter(t => t.estado === 'rechazado');

    // Renderiza cada grupo
    document.getElementById('tramitesPorCobrar').innerHTML = porCobrar.map(t => generarTramiteHTML(t)).join('');
    document.getElementById('tramitesProceso').innerHTML = proceso.map(t => generarTramiteHTML(t)).join('');
    document.getElementById('tramitesTerminados').innerHTML = terminados.map(t => generarTramiteHTML(t)).join('');
    document.getElementById('tramitesRechazados').innerHTML = rechazados.map(t => generarTramiteHTML(t)).join('');

    // NUEVO: Mostrar el término de búsqueda
    const displayElement = document.getElementById('tramitesQueryDisplay');
    if (searchTerm.trim() !== '') {
        displayElement.textContent = `Resultados para: "${searchTerm}"`;
        displayElement.style.display = 'block';
    } else {
        displayElement.style.display = 'none';
    }
    
}

function filtrarRegistros(searchTerm) {
    const term = searchTerm.toLowerCase();
    const resultados = registrosContables.filter(r => 
       (r.cliente && String(r.cliente).toLowerCase().includes(term)) ||
        (r.concepto && String(r.concepto).toLowerCase().includes(term)) ||
        (r.banco && String(r.banco).toLowerCase().includes(term)) ||
        (r.placa && String(r.placa).toLowerCase().includes(term))                                        
                                                 
    );
    // // NUEVO: Mostrar el término de búsqueda
    // const displayElement = document.getElementById('contaQueryDisplay');
    // if (searchTerm.trim() !== '') {
    //     displayElement.textContent = `Resultados para: "${searchTerm}"`;
    //     displayElement.style.display = 'block';
    // } else {
    //     displayElement.style.display = 'none';
    // }
     renderRegistrosContables(resultados);
}
//NUEVO: Función para buscar placas en la sección de contabilidad
function filtrarPlacasContabilidad(searchTerm) {
    const term = searchTerm.toLowerCase();
    const resultados = placas.filter(p => 
        (p.placa && p.placa.toLowerCase().includes(term)) ||
        (p.asignadaA && p.asignadaA.toLowerCase().includes(term))
    );
     // NUEVO: Mostrar el término de búsqueda
    const displayElement = document.getElementById('contaPlacaQueryDisplay');
    if (searchTerm.trim() !== '') {
        displayElement.textContent = `Resultados para: "${searchTerm}"`;
        displayElement.style.display = 'block';
    } else {
        displayElement.style.display = 'none';
    }
    actualizarTablaPlacasContabilidad(resultados);
}

function filtrarClientes(searchTerm) {
    const term = searchTerm.toLowerCase();
    const resultados = clientesCRM.filter(c =>
        (c.cliente && c.cliente.toLowerCase().includes(term)) ||
        (c.placa && c.placa.toLowerCase().includes(term)) ||
        (c.propietario && c.propietario.toLowerCase().includes(term)) ||
        (c.cedula && c.cedula.toLowerCase().includes(term))
    );
     // NUEVO: Mostrar el término de búsqueda
    const displayElement = document.getElementById('crmQueryDisplay');
    if (searchTerm.trim() !== '') {
        displayElement.textContent = `Resultados para: "${searchTerm}"`;
        displayElement.style.display = 'block';
    } else {
        displayElement.style.display = 'none';
    }
    renderClientesCRM(resultados);
}

function filtrarPlacas(searchTerm) {
    const term = searchTerm.toLowerCase();
    const resultados = placas.filter(p => 
        (p.placa && p.placa.toLowerCase().includes(term)) ||
        (p.cliente && p.cliente.toLowerCase().includes(term))
    );
     // NUEVO: Mostrar el término de búsqueda
    const displayElement = document.getElementById('placasQueryDisplay');
    if (searchTerm.trim() !== '') {
        displayElement.textContent = `Resultados para: "${searchTerm}"`;
        displayElement.style.display = 'block';
    } else {
        displayElement.style.display = 'none';
    }
    renderPlacas(resultados);
}
function renderTramites(tramitesToRender) {
    const tramitesContainer = document.getElementById('tramitesPorCobrar'); // O el contenedor que desees para el resultado de la búsqueda
    if (tramitesContainer) {
        tramitesContainer.innerHTML = tramitesToRender.map(t => generarTramiteHTML(t)).join('');
    }
}

function renderRegistrosContables(registrosToRender) {
    const container = document.getElementById('registrosContables');
    if (!container) return;

    const tabla = `
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Concepto</th>
                    <th>Banco/Efectivo</th>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${registrosToRender.map(reg => `
                    <tr>
                        <td>${formatDate(reg.fecha)}</td>
                        <td>${reg.cliente}</td>
                        <td>${reg.concepto}</td>
                        <td>${capitalizeFirst(reg.banco.replace('_', ' '))}</td>
                        <td>${reg.placa || 'N/A'}</td>
                        <td><span class="badge ${reg.tipo}">${capitalizeFirst(reg.tipo)}</span></td>
                        <td>${reg.monto.toLocaleString()}</td>
                        <td>
                            <button class="btn-edit" onclick="editarMovimiento('${reg.id}')">Editar</button>
                            <button class="btn-delete" onclick="eliminarMovimiento('${reg.id}')">Eliminar</button>
                            ${reg.tipo === 'egreso' ? `<button class="btn-download" onclick="descargarReciboEgreso('${reg.id}')"><i class="fas fa-file-download"></i> Recibo</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabla;
}

function renderClientesCRM(clientesToRender) {
    const container = document.getElementById('tablaCRM');
    if (!container) return;

    const tabla = `
        <table>
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Placa</th>
                    <th>Propietario</th>
                    <th>Cédula</th>
                    <th>Teléfono</th>
                    <th>Correo</th>
                    <th>Vence SOAT</th>
                    <th>Vence RTM</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${clientesToRender.map(cliente => `
                    <tr>
                        <td>${cliente.cliente}</td>
                        <td>${cliente.placa}</td>
                        <td>${cliente.propietario}</td>
                        <td>${cliente.cedula}</td>
                        <td>${cliente.telefono}</td>
                        <td>${cliente.correo}</td>
                        <td>${cliente.venceSOAT}</td>
                        <td>${cliente.venceRTM}</td>
                        <td>
                            <button class="btn-edit" onclick="editarClienteCRM('${cliente.id}')">Editar</button>
                            <button class="btn-delete" onclick="eliminarClienteCRM('${cliente.id}')">Eliminar</button>
                            <button class="btn-whatsapp" onclick="notificarWhatsApp('${cliente.telefono}')"><i class="fab fa-whatsapp"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabla;
}

function renderPlacas(placasToRender) {
    const container = document.getElementById('tablaPlacas');
    if (!container) return;

    const tabla = `
        <table>
            <thead>
                <tr>
                    <th>Placa</th>
                    <th>Cliente</th>
                    <th>Trámite</th>
                    <th>Estado</th>
                    <th>Fecha Recepción</th>
                    <th>Observaciones</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${placasToRender.map(p => `
                    <tr>
                        <td>${p.placa}</td>
                        <td>${p.cliente}</td>
                        <td>${p.tramite}</td>
                        <td>${p.estado}</td>
                        <td>${p.fechaRecepcion}</td>
                        <td>${p.observaciones}</td>
                        <td>
                            <button class="btn-edit" onclick="editarPlaca('${p.id}')">Editar</button>
                            <button class="btn-delete" onclick="eliminarPlaca('${p.id}')">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabla;
}


// FUNCIÓN DE AUTENTICACIÓN
async function handleLogin(e, auth) {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        mostrarNotificacion('Inicio de sesión exitoso', 'success');
    } catch (error) {
        console.error("Error de inicio de sesión: ", error);
        mostrarNotificacion('Credenciales incorrectas. Por favor, inténtalo de nuevo.', 'error');
    }
}

async function handleLogout(auth) {
    try {
        await signOut(auth);
        mostrarNotificacion('Sesión cerrada correctamente', 'info');
    } catch (error) {
        console.error("Error al cerrar sesión: ", error);
        mostrarNotificacion('Error al cerrar sesión', 'error');
    }
}

// FUNCIÓN PARA CAMBIAR DE SECCIÓN
function showSection(sectionId) {
    const sections = document.querySelectorAll('section.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('id') === `btn${capitalizeFirst(sectionId)}`) {
            btn.classList.add('active');
        }
    });
}

// SECCIÓN TRÁMITES
// Función para filtrar los trámites por estado
function filtrarTramitesPorEstado(filtro) {
    const porCobrar = document.getElementById('tramitesPorCobrar').parentElement;
    const proceso = document.getElementById('tramitesProceso').parentElement;
    const terminados = document.getElementById('tramitesTerminados').parentElement;
    const rechazados = document.getElementById('tramitesRechazados').parentElement;

    // Oculta todas las secciones por defecto
    porCobrar.style.display = 'none';
    proceso.style.display = 'none';
    terminados.style.display = 'none';
    rechazados.style.display = 'none';

    // Muestra la sección correspondiente al filtro
    if (filtro === 'todos') {
        porCobrar.style.display = 'block';
        proceso.style.display = 'block';
        terminados.style.display = 'block';
        rechazados.style.display = 'block';
    } else if (filtro === 'proceso') {
        proceso.style.display = 'block';
    } else if (filtro === 'terminado') {
        // En tu código, el estado 'terminado' se divide en 'pagado' y 'por cobrar'.
        // Aquí mostramos ambos para simplificar.
        porCobrar.style.display = 'block';
        terminados.style.display = 'block';
    } else if (filtro === 'rechazado') {
        rechazados.style.display = 'block';
    }
}
async function agregarTramite(e, db) {
    e.preventDefault();

    const valorInput = document.getElementById('valorInput').value;
    const valorNumerico = parseFloat(valorInput.replace(/\./g, '')) || 0; // 

    
    const tramite = {
        fecha: document.getElementById('tramiteFecha').value,
        cliente: document.getElementById('tramiteCliente').value,
        nit: document.getElementById('tramiteNit').value,
        placa: document.getElementById('tramitePlaca').value.toUpperCase(),
        tipo: document.getElementById('tramiteTipo').value,
        transito: document.getElementById('tramiteTransito').value,
        estado: document.getElementById('tramiteEstado').value,
        pago: document.getElementById('tramitePago').value,
        observaciones: '',
        valor: valorNumerico,
    };
    
    try {
        await addDoc(collection(db, 'tramites'), tramite);
        document.getElementById('tramiteForm').reset();
        document.getElementById('tramiteFecha').value = new Date().toISOString().split('T')[0];
        mostrarNotificacion('Trámite agregado correctamente', 'success');
    } catch (error) {
        console.error("Error al agregar el trámite: ", error);
        mostrarNotificacion('Error al agregar el trámite', 'error');
    }
}

function actualizarTramites() {
    // 1. "Por Cobrar" son los terminados pero pendientes de pago.
    const porCobrar = tramites.filter(t => t.estado === 'terminado' && t.pago === 'pendiente');
    
    // 2. "En Proceso" son solo aquellos con estado "proceso", independientemente del pago.
    const proceso = tramites.filter(t => t.estado === 'proceso');
    
    // 3. "Terminados" son los que tienen el estado terminado Y pago pagado.
    const terminados = tramites.filter(t => t.estado === 'terminado' && t.pago === 'pagado');
    
    // 4. "Rechazados" son solo aquellos con estado "rechazado".
    const rechazados = tramites.filter(t => t.estado === 'rechazado');

    // Ahora, actualiza las secciones del HTML con los trámites filtrados
    const tramitesPorCobrar = document.getElementById('tramitesPorCobrar');
    if (tramitesPorCobrar) tramitesPorCobrar.innerHTML = porCobrar.map(t => generarTramiteHTML(t)).join('');
    
    const tramitesProceso = document.getElementById('tramitesProceso');
    if (tramitesProceso) tramitesProceso.innerHTML = proceso.map(t => generarTramiteHTML(t)).join('');
    
    const tramitesTerminados = document.getElementById('tramitesTerminados');
    if (tramitesTerminados) tramitesTerminados.innerHTML = terminados.map(t => generarTramiteHTML(t)).join('');
    
    const tramitesRechazados = document.getElementById('tramitesRechazados');
    if (tramitesRechazados) tramitesRechazados.innerHTML = rechazados.map(t => generarTramiteHTML(t)).join('');
}

function generarTramiteHTML(tramite) {
    let estadoPagoHTML = '';
    let observacionesHTML = '';
    let reciboBtnHTML = '';
    
    if (tramite.estado === 'proceso' || tramite.estado === 'terminado') {
        estadoPagoHTML = `
             <div class="estado-pago">
                <label>Estado de Pago:</label>
                <select onchange="cambiarEstadoPago('${tramite.id}', this.value)">
                    <option value="pendiente" ${tramite.pago === 'pendiente' ? 'selected' : ''}>Por Cobrar</option>
                    <option value="pagado" ${tramite.pago === 'pagado' ? 'selected' : ''}>Pagado</option>
                </select>
                ${tramite.pago === 'pagado' ? `
                <div class="form-group" style="margin-top: 10px;">
                    <label>Valor:</label>
                   <input type="number" id="valorInput_${tramite.id}" class="valor-input" value="${tramite.valor || 0}">
                           <button class="btn-edit" onclick="actualizarValorConBoton('${tramite.id}')"><i class="fas fa-save"></i> Guardar</button>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    if (tramite.estado === 'rechazado') {
        observacionesHTML = `
            <div class="estado-pago">
                <label>Observaciones:</label>
                <textarea class="observaciones-input" placeholder="Motivo del rechazo..." 
                    onblur="actualizarObservaciones('${tramite.id}', this.value)">${tramite.observaciones || ''}</textarea>
            </div>
        `;
    }
     // Botón para descargar recibo solo si está terminado y tiene pago
    if (tramite.estado === 'terminado' && (tramite.pago === 'pendiente' || tramite.pago === 'pagado')) {
        reciboBtnHTML = `
            <button class="btn-download" onclick="descargarReciboTramite('${tramite.id}')"><i class="fas fa-file-download"></i>Descargar Recibo</button>
        `;
    }

     // Formats the value to always display two decimal places
    const formattedValor = tramite.valor ? tramite.valor.toLocaleString('es-CO', {style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A';

    
    return `
         <div class="tramite-card ${tramite.estado}">
            <div class="tramite-info">
                <strong>Fecha:</strong> ${formatDate(tramite.fecha)}<br>
                <strong>Cliente:</strong> ${tramite.cliente}<br>
                <strong>NIT:</strong> ${tramite.nit}<br>
                <strong>Placa:</strong> ${tramite.placa}<br>
                <strong>Trámite:</strong> ${tramite.tipo}<br>
                <strong>Tránsito:</strong> ${tramite.transito}<br>
                <strong>Estado:</strong> ${capitalizeFirst(tramite.estado)}
                ${tramite.pago ? `<br><strong>Pago:</strong> ${capitalizeFirst(tramite.pago)}` : ''}
                ${tramite.valor ? `<br><strong>Valor:</strong> ${tramite.valor.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}` : ''}
            </div>
            ${estadoPagoHTML}
            ${observacionesHTML}
            <div class="tramite-actions" style="margin-top: 10px;">
                <select onchange="cambiarEstadoTramite('${tramite.id}', this.value)" style="margin-right: 10px;">
                    <option value="">Cambiar Estado</option>
                    <option value="proceso" ${tramite.estado === 'proceso' ? 'disabled' : ''}>En Proceso</option>
                    <option value="terminado" ${tramite.estado === 'terminado' ? 'disabled' : ''}>Terminado</option>
                    <option value="rechazado" ${tramite.estado === 'rechazado' ? 'disabled' : ''}>Rechazado</option>
                </select>
                <button class="btn-edit" onclick="editarTramite('${tramite.id}')">Editar</button>
                <button class="btn-delete" onclick="eliminarTramite('${tramite.id}')">Eliminar</button>
                 ${reciboBtnHTML}
            </div>
        </div>
    `;
}
async function actualizarValorConBoton(tramiteId) {
    try {
        const input = document.getElementById(`valorInput_${tramiteId}`);
        const valorNumerico =  parseFloat(input.value.replace(/\./g, ''));

        if (isNaN(valorNumerico)) {
            mostrarNotificacion('Por favor, ingresa un valor numérico válido.', 'error');
            return;
        }

        await updateDoc(doc(db, 'tramites', tramiteId), { valor: valorNumerico });
        mostrarNotificacion('Valor del trámite actualizado', 'success');
    } catch (error) {
        console.error("Error al actualizar el valor: ", error);
        mostrarNotificacion('Error al actualizar el valor del trámite', 'error');
    }
}

async function cambiarEstadoTramite(id, nuevoEstado) {
    if (!nuevoEstado) return;
    try {
        await updateDoc(doc(db, 'tramites', id), { estado: nuevoEstado });
        mostrarNotificacion('Estado del trámite actualizado', 'success');
    } catch (error) {
        console.error("Error al actualizar el estado: ", error);
        mostrarNotificacion('Error al actualizar el estado del trámite', 'error');
    }
}

async function cambiarEstadoPago(id, nuevoPago) {
    try {
        await updateDoc(doc(db, 'tramites', id), { pago: nuevoPago });
        mostrarNotificacion('Estado de pago actualizado', 'success');
    } catch (error) {
        console.error("Error al actualizar el pago: ", error);
        mostrarNotificacion('Error al actualizar el estado de pago', 'error');
    }
}

async function actualizarObservaciones(id, observaciones) {
    try {
        await updateDoc(doc(db, 'tramites', id), { observaciones: observaciones });
    } catch (error) {
        console.error("Error al actualizar las observaciones: ", error);
    }
}

async function editarTramite(id) {
    const docRef = doc(db, 'tramites', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const tramite = docSnap.data();
    
    const modalBody = `
         <form id="editTramiteForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" id="editTramiteFecha" value="${tramite.fecha}" required>
                </div>
                <div class="form-group">
                    <label>Cliente</label>
                    <input type="text" id="editTramiteCliente" value="${tramite.cliente}" required>
                </div>
                 <div class="form-group">
                    <label>NIT</label>
                    <input type="text" id="editTramiteNIT" value="${tramite.nit || ''}" required>
                </div>
                <div class="form-group">
                    <label>Placa</label>
                    <input type="text" id="editTramitePlaca" value="${tramite.placa}" required>
                </div>
                 <div class="form-group">
                    <label>Tipo de Trámite</label>
                    <input type="text" id="editTramiteTipo" value="${tramite.tipo || ''}" required>
                </div>
                <div class="form-group">
                    <label>Tránsito</label>
                    <input type="text" id="editTramiteTransito" value="${tramite.transito || ''}" required>
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select id="editTramiteEstado" required>
                        <option value="proceso" ${tramite.estado === 'proceso' ? 'selected' : ''}>En Proceso</option>
                        <option value="terminado" ${tramite.estado === 'terminado' ? 'selected' : ''}>Terminado</option>
                        <option value="rechazado" ${tramite.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                    </select>
                </div>
                 <div class="form-group">
                    <label>Estado de Pago</label>
                    <select id="editTramitePago" required>
                        <option value="pendiente" ${tramite.pago === 'pendiente' ? 'selected' : ''}>Por Cobrar</option>
                        <option value="pagado" ${tramite.pago === 'pagado' ? 'selected' : ''}>Pagado</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Valor</label>
                   <input type="text" id="editTramiteValor" value="${tramite.valor ? tramite.valor.toLocaleString('es-CO') : '0'}" required>
                </div>
                 <div class="form-group" style="grid-column: span 2;">
                    <label>Observaciones</label>
                    <textarea id="editTramiteObservaciones" placeholder="Observaciones">${tramite.observaciones || ''}</textarea>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <button type="submit" class="btn-primary">Guardar Cambios</button>
                <button type="button" class="btn-secondary" onclick="document.getElementById('editModal').style.display='none'">Cancelar</button>
            </div>
        </form>
    `;
    
    document.getElementById('modalTitle').textContent = 'Editar Trámite';
    document.getElementById('modalBody').innerHTML = modalBody;
    document.getElementById('editModal').style.display = 'block';
    
    document.getElementById('editTramiteForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const valorInput = document.getElementById('editTramiteValor').value;
    const valorNumerico = parseFloat(valorInput.replace(/\./g, ''));
        const updatedTramite = {
           fecha: document.getElementById('editTramiteFecha').value,
            cliente: document.getElementById('editTramiteCliente').value,
            nit: document.getElementById('editTramiteNIT').value,
            placa: document.getElementById('editTramitePlaca').value.toUpperCase(),
            tipo: document.getElementById('editTramiteTipo').value,
            transito: document.getElementById('editTramiteTransito').value,
            estado: document.getElementById('editTramiteEstado').value,
            pago: document.getElementById('editTramitePago').value,
            valor: valorNumerico,
            observaciones: document.getElementById('editTramiteObservaciones').value
        };
        try {
            await updateDoc(docRef, updatedTramite);
            document.getElementById('editModal').style.display = 'none';
            mostrarNotificacion('Trámite actualizado correctamente', 'success');
        } catch (error) {
            console.error("Error al actualizar el trámite: ", error);
            mostrarNotificacion('Error al actualizar el trámite', 'error');
        }
    });
}

async function eliminarTramite(id) {
    if (window.confirm('¿Está seguro de eliminar este trámite?')) {
        try {
            await deleteDoc(doc(db, 'tramites', id));
            mostrarNotificacion('Trámite eliminado', 'success');
        } catch (error) {
            console.error("Error al eliminar el trámite: ", error);
            mostrarNotificacion('Error al eliminar el trámite', 'error');
        }
    }
}

// SECCIÓN CONTABILIDAD
async function agregarMovimiento(e, db) {
    e.preventDefault();
    
    const montoInput = document.getElementById('contaMonto').value;
    const monto = parseFloat(montoInput.replace(/\./g, ''));

    const movimiento = {
        fecha: document.getElementById('contaFecha').value,
        cliente: document.getElementById('contaCliente').value,
        concepto: document.getElementById('contaConcepto').value,
        placa: document.getElementById('contaPlaca').value.toUpperCase(),
        banco: document.getElementById('contaBanco').value,
        tipo: document.getElementById('contaTipo').value,
        monto: monto,
        
    };
    
    try {
        await addDoc(collection(db, 'registrosContables'), movimiento);
        document.getElementById('contabilidadForm').reset();
        document.getElementById('contaFecha').value = new Date().toISOString().split('T')[0];
        mostrarNotificacion('Movimiento registrado correctamente', 'success');
    } catch (error) {
        console.error("Error al agregar el movimiento: ", error);
        mostrarNotificacion('Error al registrar el movimiento', 'error');
    }
}

function actualizarRegistrosContables() {
    const container = document.getElementById('registrosContables');
    if (!container) return;
    const filtroTipo = document.getElementById('filtroMovimiento').value;

    let registrosFiltrados = registrosContables;
    if (filtroTipo !== 'todos') {
        registrosFiltrados = registrosContables.filter(reg => reg.tipo === filtroTipo);
    }
    
    if (registrosFiltrados.length === 0) {
        container.innerHTML = '<p>No hay registros contables para el filtro seleccionado.</p>';
        return;
    }
    
    const tabla = `
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Concepto</th> <th>Banco/Efectivo</th>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${registrosFiltrados.map(reg => `
                    <tr>
                        <td>${formatDate(reg.fecha)}</td>
                        <td>${reg.cliente}</td>
                        <td>${reg.concepto}</td>  <td>${capitalizeFirst(reg.banco.replace('_', ' '))}</td>
                        <td><span class="badge ${reg.tipo}">${capitalizeFirst(reg.tipo)}</span></td>
                        <td>${reg.monto.toLocaleString()}</td>
                        <td>
                            <button class="btn-edit" onclick="editarMovimiento('${reg.id}')">Editar</button>
                            <button class="btn-delete" onclick="eliminarMovimiento('${reg.id}')">Eliminar</button>
                            ${reg.tipo === 'egreso' ? `<button class="btn-download" onclick="descargarReciboEgreso('${reg.id}')"><i class="fas fa-file-download"></i> Recibo</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabla;
}

function consultarUtilidades() {
     const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const persona = document.getElementById('personaConsulta').value;
    
    if (!fechaInicio || !fechaFin) {
        mostrarNotificacion('Seleccione un rango de fechas para consultar', 'error');
        return;
    }

    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    // Establece la hora al final del día para incluir la fecha de fin
    end.setHours(23, 59, 59, 999); 

    let movimientos = registrosContables.filter(reg => {
        const fechaMovimiento = new Date(reg.fecha);
        fechaMovimiento.setHours(0, 0, 0, 0); // Normaliza la hora para la comparación
        return fechaMovimiento >= start && fechaMovimiento <= end;
    });

    
    if (persona) {
        movimientos = movimientos.filter(reg => 
            (persona === 'victor' && reg.banco === 'victor') ||
            (persona === 'maira' && reg.banco === 'maira') ||
            (persona === 'efectivo' && reg.banco === 'efectivo')
        );
    }
    // Ordena los movimientos por fecha (de menor a mayor)
    movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const egresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0);
    const utilidad = ingresos - egresos;
    const porcentaje = ingresos > 0 ? ((utilidad / ingresos) * 100).toFixed(2) : 0;
    
    const victorIngresos = movimientos.filter(m => m.tipo === 'ingreso' && m.banco === 'victor').reduce((sum, m) => sum + m.monto, 0);
    const victorEgresos = movimientos.filter(m => m.tipo === 'egreso' && m.banco === 'victor').reduce((sum, m) => sum + m.monto, 0);
    const mairaIngresos = movimientos.filter(m => m.tipo === 'ingreso' && m.banco === 'maira').reduce((sum, m) => sum + m.monto, 0);
    const mairaEgresos = movimientos.filter(m => m.tipo === 'egreso' && m.banco === 'maira').reduce((sum, m) => sum + m.monto, 0);
    const efectivoIngresos = movimientos.filter(m => m.tipo === 'ingreso' && m.banco === 'efectivo').reduce((sum, m) => sum + m.monto, 0);
    const efectivoEgresos = movimientos.filter(m => m.tipo === 'egreso' && m.banco === 'efectivo').reduce((sum, m) => sum + m.monto, 0);
    
    const resultadosUtilidad = document.getElementById('resultadosUtilidad');
    if (!resultadosUtilidad) return;

    const resultadosHTML = `
        <div class="utilidad-card">
            <h4>Resumen del periodo: ${formatDate(fechaInicio)} - ${formatDate(fechaFin)}</h4>
            <div class="utilidad-detalle">
                <div class="utilidad-item">
                    <strong>Total Ingresos</strong><br>
                    ${ingresos.toLocaleString()}
                </div>
                <div class="utilidad-item">
                    <strong>Total Egresos</strong><br>
                    ${egresos.toLocaleString()}
                </div>
                <div class="utilidad-item">
                    <strong>Utilidad</strong><br>
                    ${utilidad.toLocaleString()}
                </div>
                <div class="utilidad-item">
                    <strong>Margen</strong><br>
                    ${porcentaje}%
                </div>
            </div>
        </div>
        
        <div class="utilidad-card">
            <h5>Desglose por Cuenta</h5>
            <div class="utilidad-detalle">
                <div class="utilidad-item">
                    <strong>Víctor</strong><br>
                    Ingresos: ${victorIngresos.toLocaleString()}<br>
                    Egresos: ${victorEgresos.toLocaleString()}<br>
                    Neto: ${(victorIngresos - victorEgresos).toLocaleString()}
                </div>
                <div class="utilidad-item">
                    <strong>Maira</strong><br>
                    Ingresos: ${mairaIngresos.toLocaleString()}<br>
                    Egresos: ${mairaEgresos.toLocaleString()}<br>
                    Neto: ${(mairaIngresos - mairaEgresos).toLocaleString()}
                </div>
                <div class="utilidad-item">
                    <strong>Efectivo</strong><br>
                    Ingresos: ${efectivoIngresos.toLocaleString()}<br>
                    Egresos: ${efectivoEgresos.toLocaleString()}<br>
                    Neto: ${(efectivoIngresos - efectivoEgresos).toLocaleString()}
                </div>
            </div>
        </div>
        
        ${movimientos.length > 0 ? `
            <div style="margin-top: 20px;">
                <h6>Detalle de Movimientos:</h6>
                <table style="width: 100%; margin-top: 10px;">
                    <thead>
                        <tr style="background: rgba(255,255,255,0.1);">
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Cuenta</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${movimientos.map(m => `
                            <tr>
                                <td>${formatDate(m.fecha)}</td>
                                <td>${m.cliente}</td>
                                <td>${capitalizeFirst(m.banco)}</td>
                                <td>${capitalizeFirst(m.tipo)}</td>
                                <td>${m.monto.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : '<p style="margin-top: 15px;">No hay movimientos para esta fecha.</p>'}
    `;
    
    resultadosUtilidad.innerHTML = resultadosHTML;
}

async function editarMovimiento(id) {
    const docRef = doc(db, 'registrosContables', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const movimiento = docSnap.data();
    
    const modalBody = `
        <form id="editMovimientoForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" id="editContaFecha" value="${movimiento.fecha}" required>
                </div>
                <div class="form-group">
                    <label>Cliente</label>
                    <input type="text" id="editContaCliente" value="${movimiento.cliente}" required>
                </div>
                <div class="form-group">
                    <label>Banco</label>
                    <select id="editContaBanco" required>
                        <option value="victor" ${movimiento.banco === 'victor' ? 'selected' : ''}>Banco de Víctor</option>
                        <option value="maira" ${movimiento.banco === 'maira' ? 'selected' : ''}>Banco de Maira</option>
                        <option value="efectivo" ${movimiento.banco === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tipo</label>
                    <select id="editContaTipo" required>
                        <option value="ingreso" ${movimiento.tipo === 'ingreso' ? 'selected' : ''}>Ingreso</option>
                        <option value="egreso" ${movimiento.tipo === 'egreso' ? 'selected' : ''}>Egreso</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Monto</label>
                    <input type="text" id="editContaMonto" value="${movimiento.monto.toLocaleString()}" required>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <button type="submit" class="btn-primary">Guardar Cambios</button>
                <button type="button" class="btn-secondary" onclick="document.getElementById('editModal').style.display='none'">Cancelar</button>
            </div>
        </form>
    `;
    
    document.getElementById('modalTitle').textContent = 'Editar Movimiento';
    document.getElementById('modalBody').innerHTML = modalBody;
    document.getElementById('editModal').style.display = 'block';
    
    document.getElementById('editMovimientoForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const montoInput = document.getElementById('editContaMonto').value;
        const monto = parseFloat(montoInput.replace(/\./g, ''));

        const updatedMovimiento = {
            fecha: document.getElementById('editContaFecha').value,
            cliente: document.getElementById('editContaCliente').value,
            concepto: document.getElementById('editContaConcepto').value,
            banco: document.getElementById('editContaBanco').value,
            tipo: document.getElementById('editContaTipo').value,
            monto: monto
        };
        try {
            await updateDoc(docRef, updatedMovimiento);
            document.getElementById('editModal').style.display = 'none';
            mostrarNotificacion('Movimiento actualizado correctamente', 'success');
        } catch (error) {
            console.error("Error al actualizar el movimiento: ", error);
            mostrarNotificacion('Error al actualizar el movimiento', 'error');
        }
    });
}

async function eliminarMovimiento(id) {
    if (window.confirm('¿Está seguro de eliminar este movimiento contable?')) {
        try {
            await deleteDoc(doc(db, 'registrosContables', id));
            mostrarNotificacion('Movimiento eliminado', 'success');
        } catch (error) {
            console.error("Error al eliminar el movimiento: ", error);
            mostrarNotificacion('Error al eliminar el movimiento', 'error');
        }
    }
}

// SECCIÓN CRM
async function agregarClienteCRM(e, db) {
    e.preventDefault();
    const cliente = {
        cliente: document.getElementById('crmCliente').value,
        placa: document.getElementById('crmPlaca').value.toUpperCase(),
        propietario: document.getElementById('crmPropietario').value,
        cedula: document.getElementById('crmCedula').value,
        telefono: document.getElementById('crmTelefono').value,
        correo: document.getElementById('crmCorreo').value,
        venceSOAT: document.getElementById('crmVenceSOAT').value,
        venceRTM: document.getElementById('crmVenceRTM').value,
        cantidadAvisos: 0
    };
    try {
        await addDoc(collection(db, 'clientesCRM'), cliente);
        document.getElementById('crmForm').reset();
        mostrarNotificacion('Cliente agregado al CRM correctamente', 'success');
    } catch (error) {
        console.error("Error al agregar el cliente: ", error);
        mostrarNotificacion('Error al agregar el cliente', 'error');
    }
}

function actualizarTablaCRM() {
    const container = document.getElementById('tablaCRM');
    if (!container) return;
    if (clientesCRM.length === 0) {
        container.innerHTML = '<p>No hay clientes registrados en el CRM.</p>';
        return;
    }
    
    const tabla = `
        <table>
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Placa</th>
                    <th>Propietario</th>
                    <th>Cédula</th>
                    <th>Teléfono</th>
                    <th>Correo</th>
                    <th>Vence SOAT</th>
                    <th>Vence RTM</th>
                    <th>Avisos</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${clientesCRM.map(cliente => {
                    const soatVencimiento = calcularDiasVencimiento(cliente.venceSOAT);
                    const rtmVencimiento = calcularDiasVencimiento(cliente.venceRTM);
                    return `
                        <tr>
                            <td>${cliente.cliente}</td>
                            <td>${cliente.placa}</td>
                            <td>${cliente.propietario}</td>
                            <td>${cliente.cedula}</td>
                            <td>${cliente.telefono}</td>
                            <td>${cliente.correo}</td>
                            <td>
                                ${formatDate(cliente.venceSOAT)}
                                ${soatVencimiento <= 30 && soatVencimiento >= 0 ? '<span class="alerta-vencimiento">¡Próximo a vencer!</span>' : ''}
                            </td>
                            <td>
                                ${formatDate(cliente.venceRTM)}
                                ${rtmVencimiento <= 30 && rtmVencimiento >= 0 ? '<span class="alerta-vencimiento">¡Próximo a vencer!</span>' : ''}
                            </td>
                            <td>
                                <span class="cant-avisos cant-avisos-${Math.min(cliente.cantidadAvisos, 3)}">
                                    ${cliente.cantidadAvisos || 0}
                                </span>
                            </td>
                            <td>
                                <button class="btn-edit" onclick="editarClienteCRM('${cliente.id}')">Editar</button>
                                <button class="btn-delete" onclick="eliminarClienteCRM('${cliente.id}')">Eliminar</button>
                                <button class="btn-whatsapp" onclick="notificarWhatsApp('${cliente.id}', '${cliente.telefono}', '${cliente.propietario}', '${cliente.placa}', '${cliente.venceSOAT}', '${cliente.venceRTM}')">
                                     <i class="fab fa-whatsapp"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabla;
}

async function notificarWhatsApp(id, telefono, propietario, placa, venceSOAT, venceRTM) {
    try {
        const docRef = doc(db, 'clientesCRM', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const cliente = docSnap.data();
            const newAvisos = (cliente.cantidadAvisos || 0) + 1;
            await updateDoc(docRef, { cantidadAvisos: newAvisos });
        }
        
        const vencimientoSOAT = formatDate(venceSOAT);
        const vencimientoRTM = formatDate(venceRTM);
        const mensaje = `¡Hola ${propietario}! Te recordamos que el SOAT de tu vehículo con placa ${placa} vence el ${vencimientoSOAT} y la RTM vence el ${venceRTM}. En RH ASESORIAS te ofrecemos la renovación para evitar inconvenientes. ¡Contáctanos para renovarlos!`;
        const mensajeCodificado = encodeURIComponent(mensaje);
        const url = `https://api.whatsapp.com/send?phone=${telefono}&text=${mensajeCodificado}`;
        window.open(url, '_blank');
    } catch (error) {
        console.error("Error al notificar por WhatsApp: ", error);
        mostrarNotificacion('Error al enviar la notificación', 'error');
    }
}

async function enviarNotificacionVencimiento(cliente, documento, dias) {
    const asuntoEmail = `Vencimiento ${documento} - Placa ${cliente.placa}`;
    const cuerpoEmail = `Estimado/a ${cliente.propietario},\n\nSu ${documento} del vehículo con placa ${cliente.placa} vence en ${dias} día${dias > 1 ? 's' : ''}.\n\nFecha de vencimiento: ${formatDate(documento === 'SOAT' ? cliente.venceSOAT : cliente.venceRTM)}\n\nEn RH ASESORIAS te ofrecemos la renovación para evitar inconvenientes.\n\nSaludos cordiales.`;

    try {
        const response = await fetch('http://localhost:3000/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                correo: cliente.correo,
                asunto: asuntoEmail,
                cuerpo: cuerpoEmail
            })
        });

        if (!response.ok) {
            throw new Error('La respuesta del servidor no fue exitosa.');
        }

        const data = await response.json();
        console.log('Respuesta del servidor:', data.message);
        const docRef = doc(db, 'clientesCRM', cliente.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const clienteData = docSnap.data();
            const newAvisos = (clienteData.cantidadAvisos || 0) + 1;
            await updateDoc(docRef, { cantidadAvisos: newAvisos });
            console.log(`Contador de avisos actualizado a ${newAvisos} para el cliente con ID: ${cliente.id}`);
        } else {
            console.error(`Error: No se encontró el documento para el cliente con ID: ${cliente.id}`);
        }
        return true;

    } catch (error) {
        console.error('Error al enviar el email:', error);
        mostrarNotificacion(`Error al enviar el email: ${error.message}`, 'error');
        return false;
    }
}

async function verificarVencimientos(db) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hoyISO = today.toISOString().split('T')[0];
    let avisosEnviados = 0;

    const snapshot = await getDocs(collection(db, 'clientesCRM'));
    const clientes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const cliente of clientes) {
        if (!cliente.correo) continue;
        const venceSOAT = new Date(cliente.venceSOAT);
        venceSOAT.setHours(0, 0, 0, 0);
        const venceRTM = new Date(cliente.venceRTM);
        venceRTM.setHours(0, 0, 0, 0);
        const diasSOAT = Math.ceil((venceSOAT - today) / (1000 * 60 * 60 * 24));
        const diasRTM = Math.ceil((venceRTM - today) / (1000 * 60 * 60 * 24));
        const keySOAT = `notificacion_enviada_${cliente.id}_SOAT_${hoyISO}`;
        const keyRTM = `notificacion_enviada_${cliente.id}_RTM_${hoyISO}`;
        
        if (diasSOAT <= 7 && diasSOAT >= 0 && !localStorage.getItem(keySOAT)) {
            const emailSent = await enviarNotificacionVencimiento(cliente, 'SOAT', diasSOAT);
            if (emailSent) {
                localStorage.setItem(keySOAT, true);
                avisosEnviados++;
            }
        }
        
        if (diasRTM <= 7 && diasRTM >= 0 && !localStorage.getItem(keyRTM)) {
            const emailSent = await enviarNotificacionVencimiento(cliente, 'RTM', diasRTM);
            if (emailSent) {
                localStorage.setItem(keyRTM, true);
                avisosEnviados++;
            }
        }
    }

    if (avisosEnviados > 0) {
        mostrarNotificacion(`Se han enviado ${avisosEnviados} avisos de vencimiento por Email.`, 'info');
    }
}

async function editarClienteCRM(id) {
    const docRef = doc(db, 'clientesCRM', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const cliente = docSnap.data();
    
    const modalBody = `
        <form id="editCrmForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Cliente</label>
                    <input type="text" id="editCrmCliente" value="${cliente.cliente}" required>
                </div>
                <div class="form-group">
                    <label>Placa</label>
                    <input type="text" id="editCrmPlaca" value="${cliente.placa}" required>
                </div>
                <div class="form-group">
                    <label>Propietario</label>
                    <input type="text" id="editCrmPropietario" value="${cliente.propietario}" required>
                </div>
                <div class="form-group">
                    <label>Cédula</label>
                    <input type="text" id="editCrmCedula" value="${cliente.cedula}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" id="editCrmTelefono" value="${cliente.telefono}" required>
                </div>
                <div class="form-group">
                    <label>Correo</label>
                    <input type="email" id="editCrmCorreo" value="${cliente.correo}">
                </div>
                <div class="form-group">
                    <label>Vence SOAT</label>
                    <input type="date" id="editCrmVenceSOAT" value="${cliente.venceSOAT}" required>
                </div>
                <div class="form-group">
                    <label>Vence RTM</label>
                    <input type="date" id="editCrmVenceRTM" value="${cliente.venceRTM}" required>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <button type="submit" class="btn-primary">Guardar Cambios</button>
                <button type="button" class="btn-secondary" onclick="document.getElementById('editModal').style.display='none'">Cancelar</button>
            </div>
        </form>
    `;
    
    document.getElementById('modalTitle').textContent = 'Editar Cliente CRM';
    document.getElementById('modalBody').innerHTML = modalBody;
    document.getElementById('editModal').style.display = 'block';
    
    document.getElementById('editCrmForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const updatedCliente = {
            cliente: document.getElementById('editCrmCliente').value,
            placa: document.getElementById('editCrmPlaca').value.toUpperCase(),
            propietario: document.getElementById('editCrmPropietario').value,
            cedula: document.getElementById('editCrmCedula').value,
            telefono: document.getElementById('editCrmTelefono').value,
            correo: document.getElementById('editCrmCorreo').value,
            venceSOAT: document.getElementById('editCrmVenceSOAT').value,
            venceRTM: document.getElementById('editCrmVenceRTM').value
        };
        try {
            await updateDoc(docRef, updatedCliente);
            document.getElementById('editModal').style.display = 'none';
            mostrarNotificacion('Cliente actualizado correctamente', 'success');
        } catch (error) {
            console.error("Error al actualizar el cliente: ", error);
            mostrarNotificacion('Error al actualizar el cliente', 'error');
        }
    });
}

async function eliminarClienteCRM(id) {
    if (window.confirm('¿Está seguro de eliminar este cliente del CRM?')) {
        try {
            await deleteDoc(doc(db, 'clientesCRM', id));
            mostrarNotificacion('Cliente eliminado', 'success');
        } catch (error) {
            console.error("Error al eliminar el cliente: ", error);
            mostrarNotificacion('Error al eliminar el cliente', 'error');
        }
    }
}
// SECCIÓN PLACAS
// SECCIÓN PLACAS
async function registrarPlaca(e, db) {
    e.preventDefault();

    const placaInicialStr = document.getElementById('placaInicial').value.toUpperCase();
    const placaFinalStr = document.getElementById('placaFinal').value.toUpperCase();
    const asignadaA = document.getElementById('placaAsignadaA').value;
    const fechaRecepcion = document.getElementById('placaFechaRecepcion').value;
    const fechaAsignada = document.getElementById('placaFechaAsignada').value;
    const fechaMatricula = document.getElementById('placaFechaMatricula').value;
    const observaciones = document.getElementById('placaObservaciones').value;

    function parsePlaca(placa) {
        const match = placa.match(/^([A-Z]+)(\d+)([A-Z]?)$/);
        if (!match) {
            mostrarNotificacion('Formato de placa inválido. Ej: JHP34G', 'error');
            throw new Error('Formato de placa inválido');
        }
        return {
            letras1: match[1],
            numero: parseInt(match[2], 10),
            letras2: match[3] || ''
        };
    }

    try {
        const placaInicial = parsePlaca(placaInicialStr);
        const placaFinal = parsePlaca(placaFinalStr);

        if (placaInicial.letras1 !== placaFinal.letras1 || placaInicial.letras2 !== placaFinal.letras2 || placaInicial.numero > placaFinal.numero) {
            mostrarNotificacion('El rango de placas no es válido. Las letras deben coincidir y la placa final debe ser mayor que la inicial.', 'error');
            return;
        }

        const padding = placaInicialStr.match(/\d+/)[0].length;
        const batch = writeBatch(db);

        for (let i = placaInicial.numero; i <= placaFinal.numero; i++) {
            const numeroFormateado = String(i).padStart(padding, '0');
            const nuevaPlaca = `${placaInicial.letras1}${numeroFormateado}${placaInicial.letras2}`;

            const placaData = {
                placa: nuevaPlaca,
                asignadaA,
                fechaRecepcion,
                fechaAsignada,
                fechaMatricula,
                observaciones,
                estado: obtenerEstadoPlaca(fechaAsignada, fechaMatricula, asignadaA)
            };
            const docRef = doc(collection(db, 'placas'));
            batch.set(docRef, placaData);
        }
        await batch.commit();

        document.getElementById('placasForm').reset();
        document.getElementById('placaFechaRecepcion').value = new Date().toISOString().split('T')[0];
        mostrarNotificacion(`Rango de placas de ${placaInicialStr} a ${placaFinalStr} registrado correctamente`, 'success');

    } catch (e) {
        console.error(e);
        mostrarNotificacion('Error al registrar las placas', 'error');
    }
}

function actualizarTablaPlacas(placasAMostrar = placas) {
    const container = document.getElementById('tablaPlacas');
    if (!container) return;
    if (!placasAMostrar || placasAMostrar.length === 0) {
        // Mensaje más descriptivo para la búsqueda
        container.innerHTML = '<p>No hay placas que coincidan con la búsqueda.</p>';
        return;
    }
    // Ordena las placas de menor a mayor
    const placasOrdenadas = [...placasAMostrar].sort((a, b) => {
        // Extrae letras y números para comparación adecuada
        const placaRegex = /^([A-Z]+)(\d+)([A-Z]?)$/;
        const matchA = a.placa.match(placaRegex);
        const matchB = b.placa.match(placaRegex);

        if (matchA && matchB) {
            const letrasCompare = matchA[1].localeCompare(matchB[1]);
            if (letrasCompare !== 0) return letrasCompare;
            const numeroCompare = parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
            if (numeroCompare !== 0) return numeroCompare;
            return matchA[3].localeCompare(matchB[3]);
        }
        return a.placa.localeCompare(b.placa);
    });

    const tabla = `
        <table>
            <thead>
                <tr>
                    <th>Placa</th>
                    <th>Asignada a</th>
                    <th>F. Recepción</th>
                    <th>F. Asignada</th>
                    <th>F. Matrícula</th>
                    <th>Observaciones</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${placasOrdenadas.map(p => {
                    const estado = obtenerEstadoPlaca(p.fechaAsignada, p.fechaMatricula, p.asignadaA);
                    return `
                        <tr>
                            <td>${p.placa}</td>
                            <td>${p.asignadaA || 'N/A'}</td>
                            <td>${formatDate(p.fechaRecepcion)}</td>
                            <td>${formatDate(p.fechaAsignada)}</td>
                            <td>${formatDate(p.fechaMatricula)}</td>
                            <td>${p.observaciones || 'N/A'}</td>
                            <td><span class="badge badge-${estado.toLowerCase().replace(' ', '-')}">${estado}</span></td>
                            <td>
                                <button class="btn-edit" onclick="editarPlaca('${p.id}')">Editar</button>
                                <button class="btn-delete" onclick="eliminarPlaca('${p.id}')">Eliminar</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabla;
}

// NUEVO: Función para actualizar la tabla de placas en la sección de contabilidad
function actualizarTablaPlacasContabilidad(placasAMostrar = placas) {
    const container = document.getElementById('tablaPlacasContabilidad');
    if (!container) return;
    if (!placasAMostrar || placasAMostrar.length === 0) {
        container.innerHTML = '<p>No hay placas que coincidan con la búsqueda.</p>';
        return;
    }

    const placasOrdenadas = [...placasAMostrar].sort((a, b) => a.placa.localeCompare(b.placa));

    const tabla = `
        <table>
            <thead>
                <tr>
                    <th>Placa</th>
                    <th>Asignada a</th>
                    <th>F. Recepción</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${placasOrdenadas.map(p => {
                    const estado = obtenerEstadoPlaca(p.fechaAsignada, p.fechaMatricula, p.asignadaA);
                    return `
                        <tr>
                            <td>${p.placa}</td>
                            <td>${p.asignadaA || 'N/A'}</td>
                            <td>${formatDate(p.fechaRecepcion)}</td>
                            <td><span class="badge badge-${estado.toLowerCase().replace(' ', '-')}">${estado}</span></td>
                            <td>
                                <button class="btn-edit" onclick="editarPlaca('${p.id}')">Editar</button>
                                <button class="btn-delete" onclick="eliminarPlaca('${p.id}')">Eliminar</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabla;
}


function obtenerEstadoPlaca(fechaAsignada, fechaMatricula, asignadaA) {
    if (fechaMatricula && fechaMatricula.length > 0) {
        return 'Matriculada';
    } else if (fechaAsignada && fechaAsignada.length > 0) {
        return 'Asignada';
    } else if (asignadaA && asignadaA.length > 0) {
        return 'Recibida';
    } else {
        return 'En Trámite';
    }
}

async function editarPlaca(id) {
    const docRef = doc(db, 'placas', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const placa = docSnap.data();

    const modalBody = `
        <form id="editPlacaForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Placa</label>
                    <input type="text" id="editPlaca" value="${placa.placa}" required>
                </div>
                <div class="form-group">
                    <label>Asignada a</label>
                    <input type="text" id="editPlacaAsignadaA" value="${placa.asignadaA || ''}" required>
                </div>
                <div class="form-group">
                    <label>Fecha Recepción</label>
                    <input type="date" id="editPlacaFechaRecepcion" value="${placa.fechaRecepcion}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Fecha Asignada</label>
                    <input type="date" id="editPlacaFechaAsignada" value="${placa.fechaAsignada}">
                </div>
                <div class="form-group">
                    <label>Fecha Matrícula</label>
                    <input type="date" id="editPlacaFechaMatricula" value="${placa.fechaMatricula}">
                </div>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea id="editPlacaObservaciones" placeholder="Observaciones adicionales">${placa.observaciones || ''}</textarea>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <button type="submit" class="btn-primary">Guardar Cambios</button>
                <button type="button" class="btn-secondary" onclick="document.getElementById('editModal').style.display='none'">Cancelar</button>
            </div>
        </form>
    `;

    document.getElementById('modalTitle').textContent = 'Editar Registro de Placa';
    document.getElementById('modalBody').innerHTML = modalBody;
    document.getElementById('editModal').style.display = 'block';

    document.getElementById('editPlacaForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nuevaPlaca = document.getElementById('editPlaca').value.toUpperCase();
        const nuevaAsignadaA = document.getElementById('editPlacaAsignadaA').value;
        const nuevaFechaRecepcion = document.getElementById('editPlacaFechaRecepcion').value;
        const nuevaFechaAsignada = document.getElementById('editPlacaFechaAsignada').value;
        const nuevaFechaMatricula = document.getElementById('editPlacaFechaMatricula').value;
        const nuevasObservaciones = document.getElementById('editPlacaObservaciones').value;

        const updatedPlaca = {
            placa: nuevaPlaca,
            asignadaA: nuevaAsignadaA,
            fechaRecepcion: nuevaFechaRecepcion,
            fechaAsignada: nuevaFechaAsignada,
            fechaMatricula: nuevaFechaMatricula,
            observaciones: nuevasObservaciones,
            estado: obtenerEstadoPlaca(nuevaFechaAsignada, nuevaFechaMatricula, nuevaAsignadaA)
        };
        try {
            await updateDoc(docRef, updatedPlaca);
            document.getElementById('editModal').style.display = 'none';
            mostrarNotificacion('Placa actualizada correctamente', 'success');
        } catch (error) {
            console.error("Error al actualizar la placa: ", error);
            mostrarNotificacion('Error al actualizar la placa', 'error');
        }
    });
}

async function eliminarPlaca(id) {
    if (window.confirm('¿Está seguro de eliminar esta placa?')) {
        try {
            await deleteDoc(doc(db, 'placas', id));
            mostrarNotificacion('Placa eliminada', 'success');
        } catch (error) {
            console.error("Error al eliminar la placa: ", error);
            mostrarNotificacion('Error al eliminar la placa', 'error');
        }
    }
}


// FUNCIONES DE UTILIDAD
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function mostrarNotificacion(mensaje, tipo) {
    const notificacion = document.getElementById('notificacion');
    if (notificacion) {
        notificacion.textContent = mensaje;
        notificacion.className = `notificacion ${tipo}`;
        notificacion.style.display = 'block';
        setTimeout(() => {
            notificacion.style.display = 'none';
        }, 5000);
    } else {
        console.log(mensaje);
    }
}

function calcularDiasVencimiento(fecha) {
    const hoy = new Date();
    const fechaVencimiento = new Date(fecha);
    const diferenciaMs = fechaVencimiento - hoy;
    return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
}


function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Agrega un pequeño ajuste de 12 horas para evitar la transición de medianoche en la zona horaria.
    date.setHours(date.getHours() + 12);
    return date.toLocaleDateString();
}


async function descargarReciboTramite(tramiteId) {
    try {
        const tramite = tramites.find(t => t.id === tramiteId);
        if (!tramite) {
            mostrarNotificacion('No se encontró el trámite', 'error');
            return;
        }

       const valorFormateado = tramite.valor ? tramite.valor.toLocaleString('es-CO', {style: 'currency', currency: 'COP'}) : 'N/A';
       const nit = tramite.nit || 'N/A';
       const tipoTramite = tramite.tipo || 'N/A';
       const transito = tramite.transito || 'N/A';

    const reciboHTML = `
            <style>
                .recibo-minimo {
                    font-family: Arial, sans-serif;
                    width: 120px; /* Ancho muy reducido */
                    padding: 3px;
                    margin: 0;
                    border: 1px dashed #333;
                    color: #000;
                    font-size: 6px; /* Letra muy pequeña */
                    line-height: 1.1;
                    box-sizing: border-box;
                    word-wrap: break-word;
                }
                .recibo-minimo h2 {
                    text-align: center;
                    font-size: 8px; /* Título más pequeño */
                    font-weight: bold;
                    margin: 0 0 3px 0;
                    color: orange;
                }
                .recibo-minimo img {
                    display: block;
                    max-width: 40px; /* Logo más pequeño */
                    height: auto;
                    margin: 0 auto 3px auto;
                }
                .recibo-minimo .info-section {
                    text-align: left;
                    margin-bottom: 3px;
                }
                .recibo-minimo .info-section p {
                    margin: 1px 0;
                }
                .recibo-minimo .info-section strong {
                    font-weight: bold;
                    display: inline-block;
                    width: 50px; /* Ancho fijo para las etiquetas */
                }
                .recibo-minimo hr {
                    border: none;
                    border-top: 1px dashed #000;
                    margin: 3px 0;
                }
                .recibo-minimo .valor-section {
                    text-align: center;
                    margin-top: 3px;
                }
                .recibo-minimo .valor-section .valor {
                    font-size: 8px; /* Valor más pequeño */
                    font-weight: bold;
                    margin-top: 2px;
                }
                .recibo-minimo .gracias {
                    text-align: center;
                    margin-top: 5px;
                    font-size: 5px; /* Mensaje de agradecimiento muy pequeño */
                    font-style: italic;
                }
            </style>
            <div class="recibo-minimo">
                <img src="LOGO 2025 .png" alt="Logo de la Empresa">
                <h2>RECIBO DE TRÁMITE</h2>
                <div class="info-section">
                    <p><strong>Fecha:</strong> ${formatDate(tramite.fecha)}</p>
                    <p><strong>Cliente:</strong> ${tramite.cliente}</p>
                    <p><strong>NIT:</strong> ${nit}</p>
                    <p><strong>Placa:</strong> ${tramite.placa}</p>
                    <p><strong>Tipo de Trámite:</strong> ${tipoTramite}</p>
                    <p><strong>Tránsito:</strong> ${transito}</p>
                    <p><strong>Estado:</strong> ${capitalizeFirst(tramite.estado)}</p>
                    <p><strong>Estado de Pago:</strong> ${capitalizeFirst(tramite.pago)}</p>
                </div>
                <hr>
                <div class="valor-section">
                    <p><strong>Valor:</strong></p>
                    <p class="valor">${valorFormateado}</p>
                </div>
                <p class="gracias">¡Gracias por su confianza!</p>
            </div>
        `;

        const reciboDiv = document.createElement('div');
        reciboDiv.innerHTML = reciboHTML;
        reciboDiv.style.position = 'absolute';
        reciboDiv.style.left = '-9999px';
        document.body.appendChild(reciboDiv);

        const canvas = await html2canvas(reciboDiv, { scale: 5 });
        const imgData = canvas.toDataURL('image/png');

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Recibo_Tramite_${tramite.placa}_${tramite.cliente}.pdf`);

        document.body.removeChild(reciboDiv);
        mostrarNotificacion('Recibo descargado correctamente.', 'success');

    } catch (err) {
        console.error("Error generando PDF:", err);
        mostrarNotificacion('Error al generar el recibo', 'error');
    }
}
async function descargarTodosRecibos() {
    // Filtra solo los trámites que están terminados y pagados
   const tramitesTerminados = tramites.filter(t => t.estado === 'terminado');

    if (tramitesTerminados.length === 0) {
        mostrarNotificacion('No hay recibos para descargar.', 'info');
        return;
    }

    mostrarNotificacion(`Iniciando la descarga de ${tramitesTerminados.length} recibos... Esto puede tomar un momento.`, 'info');

    // Bucle asíncrono para descargar un recibo a la vez con un retraso
    for (const tramite of tramitesTerminados) {
        // Asegúrate de usar la versión corregida de descargarReciboTramite
        await new Promise(resolve => setTimeout(resolve, 1000)); // Retraso de 1 segundo
        await descargarReciboTramite(tramite.id);
    }
    
    mostrarNotificacion('Descarga de todos los recibos completada.', 'success');
}

// NUEVO: Función para generar y descargar un recibo de egreso en PDF
async function descargarReciboEgreso(movimientoId) {
    try {
        const movimiento = registrosContables.find(m => m.id === movimientoId);
        if (!movimiento) {
            mostrarNotificacion('No se encontró el movimiento de egreso', 'error');
            return;
        }

        const montoFormateado = movimiento.monto ? movimiento.monto.toLocaleString('es-CO', {style: 'currency', currency: 'COP'}) : 'N/A';
        const fecha = formatDate(movimiento.fecha);
        const concepto = movimiento.concepto || 'N/A';
        const cliente = movimiento.cliente || 'N/A';
        const banco = capitalizeFirst(movimiento.banco.replace('_', ' ')) || 'N/A';
        const placa = movimiento.placa || 'N/A';

        const reciboHTML = `
           <div class="recibo-container">
           <img src="LOGO 2025 .png" alt="Logo de la Empresa" class="recibo-logo">
               <h2 class="recibo-titulo">RECIBO DE EGRESO</h2>
               <div class="recibo-info">
                   <p><strong>Fecha:</strong> ${fecha}</p>
                   <p><strong>Cliente:</strong> ${cliente}</p>
                   <p><strong>Placa:</strong> ${placa}</p>
                   <p><strong>Concepto:</strong> ${concepto}</p>
                   <p><strong>Cuenta:</strong> ${banco}</p>
                   <hr>
                   <div class="recibo-detalle">
                       <p><strong>Monto:</strong> ${montoFormateado}</p>
                   </div>
               </div>
               <p class="recibo-gracias">Este documento sirve como constancia del egreso.</p>
           </div>
        `;

        const reciboDiv = document.createElement('div');
        reciboDiv.innerHTML = reciboHTML;
        reciboDiv.style.position = 'absolute';
        reciboDiv.style.left = '-9999px';
        document.body.appendChild(reciboDiv);

        const canvas = await html2canvas(reciboDiv, { scale: 5 });
        const imgData = canvas.toDataURL('image/png');

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Recibo_Egreso_${movimiento.fecha}_${movimiento.cliente}.pdf`);

        document.body.removeChild(reciboDiv);
        mostrarNotificacion('Recibo de egreso descargado correctamente.', 'success');

    } catch (err) {
        console.error("Error generando PDF de egreso:", err);
        mostrarNotificacion('Error al generar el recibo de egreso', 'error');
    }
}


// Expone las funciones a la ventana global para que el HTML pueda acceder a ellas.
window.descargarReciboTramite = descargarReciboTramite;
window.descargarTodosRecibos = descargarTodosRecibos;
window.showSection = showSection;
window.cambiarEstadoTramite = cambiarEstadoTramite;
window.cambiarEstadoPago = cambiarEstadoPago;
window.actualizarObservaciones = actualizarObservaciones;
window.editarTramite = editarTramite;
window.eliminarTramite = eliminarTramite;
window.consultarUtilidades = consultarUtilidades;
window.editarMovimiento = editarMovimiento;
window.eliminarMovimiento = eliminarMovimiento;
window.editarClienteCRM = editarClienteCRM;
window.eliminarClienteCRM = eliminarClienteCRM;
window.notificarWhatsApp = notificarWhatsApp;
window.verificarVencimientos = verificarVencimientos;
window.editarPlaca = editarPlaca;
window.eliminarPlaca = eliminarPlaca;
window.actualizarRegistrosContables = actualizarRegistrosContables;
window.actualizarTablaCRM = actualizarTablaCRM;
window.actualizarTablaPlacas = actualizarTablaPlacas;
window.filtrarTramites = filtrarTramites;
window.actualizarValorConBoton = actualizarValorConBoton;
window.descargarReciboEgreso = descargarReciboEgreso; // NUEVO: Exponer la nueva función
window.actualizarTablaPlacasContabilidad = actualizarTablaPlacasContabilidad;
window.filtrarPlacasContabilidad = filtrarPlacasContabilidad;
