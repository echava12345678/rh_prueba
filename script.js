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
            });

            onSnapshot(collection(db, 'placas'), (snapshot) => {
                placas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                actualizarTablaPlacas();
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
            // Código eliminado para evitar notificaciones automáticas.
            // verificarVencimientos(db);
            // setInterval(() => verificarVencimientos(db), 3600000);

            // Muestra la sección inicial
            showSection('tramites');

        } else {
            // El usuario ha cerrado sesión o no ha iniciado sesión
            loginPanel.style.display = 'block';
            appContainer.style.display = 'none';
        }
    });
});

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
async function agregarTramite(e, db) {
    e.preventDefault();
    
    const tramite = {
        fecha: document.getElementById('tramiteFecha').value,
        cliente: document.getElementById('tramiteCliente').value,
        placa: document.getElementById('tramitePlaca').value.toUpperCase(),
        estado: document.getElementById('tramiteEstado').value,
        pago: 'pendiente',
        observaciones: ''
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
    const proceso = tramites.filter(t => t.estado === 'proceso');
    const terminados = tramites.filter(t => t.estado === 'terminado');
    const rechazados = tramites.filter(t => t.estado === 'rechazado');
    
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
    
    if (tramite.estado === 'proceso' || tramite.estado === 'terminado') {
        estadoPagoHTML = `
            <div class="estado-pago">
                <label>Estado de Pago:</label>
                <select onchange="cambiarEstadoPago('${tramite.id}', this.value)">
                    <option value="pendiente" ${tramite.pago === 'pendiente' ? 'selected' : ''}>Por Cobrar</option>
                    <option value="pagado" ${tramite.pago === 'pagado' ? 'selected' : ''}>Pagado</option>
                </select>
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
    
    return `
        <div class="tramite-item ${tramite.estado}">
            <div class="tramite-info">
                <strong>Cliente:</strong> ${tramite.cliente}<br>
                <strong>Placa:</strong> ${tramite.placa}<br>
                <strong>Fecha:</strong> ${new Date(tramite.fecha).toLocaleDateString()}<br>
                <strong>Estado:</strong> ${capitalizeFirst(tramite.estado)}
                ${tramite.pago && tramite.pago !== 'pendiente' ? `<br><strong>Pago:</strong> ${capitalizeFirst(tramite.pago)}` : ''}
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
            </div>
        </div>
    `;
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
                    <label>Placa</label>
                    <input type="text" id="editTramitePlaca" value="${tramite.placa}" required>
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select id="editTramiteEstado" required>
                        <option value="proceso" ${tramite.estado === 'proceso' ? 'selected' : ''}>En Proceso</option>
                        <option value="terminado" ${tramite.estado === 'terminado' ? 'selected' : ''}>Terminado</option>
                        <option value="rechazado" ${tramite.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                    </select>
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
        const updatedTramite = {
            fecha: document.getElementById('editTramiteFecha').value,
            cliente: document.getElementById('editTramiteCliente').value,
            placa: document.getElementById('editTramitePlaca').value.toUpperCase(),
            estado: document.getElementById('editTramiteEstado').value
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
        banco: document.getElementById('contaBanco').value,
        tipo: document.getElementById('contaTipo').value,
        monto: monto
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
                    <th>Banco/Efectivo</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${registrosFiltrados.map(reg => `
                    <tr>
                        <td>${new Date(reg.fecha).toLocaleDateString()}</td>
                        <td>${reg.cliente}</td>
                        <td>${capitalizeFirst(reg.banco.replace('_', ' '))}</td>
                        <td><span class="badge ${reg.tipo}">${capitalizeFirst(reg.tipo)}</span></td>
                        <td>${reg.monto.toLocaleString()}</td>
                        <td>
                            <button class="btn-edit" onclick="editarMovimiento('${reg.id}')">Editar</button>
                            <button class="btn-delete" onclick="eliminarMovimiento('${reg.id}')">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabla;
}

function consultarUtilidades() {
    const fecha = document.getElementById('fechaConsulta').value;
    const persona = document.getElementById('personaConsulta').value;
    
    if (!fecha) {
        mostrarNotificacion('Seleccione una fecha para consultar', 'error');
        return;
    }
    
    let movimientos = registrosContables.filter(reg => reg.fecha === fecha);
    
    if (persona) {
        movimientos = movimientos.filter(reg => 
            (persona === 'victor' && reg.banco === 'victor') ||
            (persona === 'maira' && reg.banco === 'maira') ||
            (persona === 'efectivo' && reg.banco === 'efectivo')
        );
    }
    
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
            <h4>Resumen del ${new Date(fecha).toLocaleDateString()} ${persona ? '- ' + capitalizeFirst(persona) : ''}</h4>
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
                            <th>Cliente</th>
                            <th>Cuenta</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${movimientos.map(m => `
                            <tr>
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
        nombre: document.getElementById('crmNombre').value,
        contacto: document.getElementById('crmContacto').value,
        tipo: document.getElementById('crmTipo').value,
        detalles: document.getElementById('crmDetalles').value
    };
    try {
        await addDoc(collection(db, 'clientesCRM'), cliente);
        document.getElementById('crmForm').reset();
        mostrarNotificacion('Cliente agregado al CRM', 'success');
    } catch (error) {
        console.error("Error al agregar el cliente CRM: ", error);
        mostrarNotificacion('Error al agregar el cliente al CRM', 'error');
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
                    <th>Nombre</th>
                    <th>Contacto</th>
                    <th>Tipo</th>
                    <th>Detalles</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${clientesCRM.map(c => `
                    <tr>
                        <td>${c.nombre}</td>
                        <td>${c.contacto}</td>
                        <td>${capitalizeFirst(c.tipo)}</td>
                        <td>${c.detalles}</td>
                        <td>
                            <button class="btn-edit" onclick="editarClienteCRM('${c.id}')">Editar</button>
                            <button class="btn-delete" onclick="eliminarClienteCRM('${c.id}')">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabla;
}

async function editarClienteCRM(id) {
    const docRef = doc(db, 'clientesCRM', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const cliente = docSnap.data();
    const modalBody = `
        <form id="editCRMForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" id="editCrmNombre" value="${cliente.nombre}" required>
                </div>
                <div class="form-group">
                    <label>Contacto</label>
                    <input type="text" id="editCrmContacto" value="${cliente.contacto}" required>
                </div>
                <div class="form-group">
                    <label>Tipo</label>
                    <select id="editCrmTipo" required>
                        <option value="persona" ${cliente.tipo === 'persona' ? 'selected' : ''}>Persona</option>
                        <option value="empresa" ${cliente.tipo === 'empresa' ? 'selected' : ''}>Empresa</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Detalles</label>
                    <textarea id="editCrmDetalles">${cliente.detalles}</textarea>
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
    
    document.getElementById('editCRMForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const updatedCliente = {
            nombre: document.getElementById('editCrmNombre').value,
            contacto: document.getElementById('editCrmContacto').value,
            tipo: document.getElementById('editCrmTipo').value,
            detalles: document.getElementById('editCrmDetalles').value
        };
        try {
            await updateDoc(docRef, updatedCliente);
            document.getElementById('editModal').style.display = 'none';
            mostrarNotificacion('Cliente CRM actualizado correctamente', 'success');
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
async function registrarPlaca(e, db) {
    e.preventDefault();
    const placa = {
        placa: document.getElementById('placaNumero').value.toUpperCase(),
        dueno: document.getElementById('placaDueno').value,
        fechaRecepcion: document.getElementById('placaFechaRecepcion').value,
        fechaVencimientoSOAT: document.getElementById('placaFechaSoat').value,
        fechaVencimientoTecno: document.getElementById('placaFechaTecno').value,
        fechaVencimientoLicencia: document.getElementById('placaFechaLicencia').value,
        estado: 'activo',
        observaciones: document.getElementById('placaObservaciones').value
    };
    try {
        await addDoc(collection(db, 'placas'), placa);
        document.getElementById('placasForm').reset();
        document.getElementById('placaFechaRecepcion').value = new Date().toISOString().split('T')[0];
        mostrarNotificacion('Placa registrada correctamente', 'success');
    } catch (error) {
        console.error("Error al registrar la placa: ", error);
        mostrarNotificacion('Error al registrar la placa', 'error');
    }
}

function actualizarTablaPlacas() {
    const container = document.getElementById('tablaPlacas');
    if (!container) return;
    if (placas.length === 0) {
        container.innerHTML = '<p>No hay placas registradas.</p>';
        return;
    }

    const tabla = `
        <table>
            <thead>
                <tr>
                    <th>Placa</th>
                    <th>Dueño</th>
                    <th>Fechas de Vencimiento</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${placas.map(p => generarPlacaHTML(p)).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tabla;
}

function generarPlacaHTML(placa) {
    const diasSoat = placa.fechaVencimientoSOAT ? calcularDiasVencimiento(placa.fechaVencimientoSOAT) : null;
    const diasTecno = placa.fechaVencimientoTecno ? calcularDiasVencimiento(placa.fechaVencimientoTecno) : null;
    const diasLicencia = placa.fechaVencimientoLicencia ? calcularDiasVencimiento(placa.fechaVencimientoLicencia) : null;

    return `
        <tr>
            <td>
                <strong>${placa.placa}</strong><br>
                <small>${placa.dueno}</small>
            </td>
            <td>
                SOAT: <span class="badge ${diasSoat < 30 ? 'vence-pronto' : ''}">${placa.fechaVencimientoSOAT || 'N/A'} ${diasSoat !== null ? `(${diasSoat} días)` : ''}</span><br>
                T.Mecánica: <span class="badge ${diasTecno < 30 ? 'vence-pronto' : ''}">${placa.fechaVencimientoTecno || 'N/A'} ${diasTecno !== null ? `(${diasTecno} días)` : ''}</span><br>
                Licencia: <span class="badge ${diasLicencia < 30 ? 'vence-pronto' : ''}">${placa.fechaVencimientoLicencia || 'N/A'} ${diasLicencia !== null ? `(${diasLicencia} días)` : ''}</span>
            </td>
            <td>
                <button class="btn-edit" onclick="editarPlaca('${placa.id}')">Editar</button>
                <button class="btn-delete" onclick="eliminarPlaca('${placa.id}')">Eliminar</button>
                <button class="btn-whatsapp" onclick="notificarWhatsApp('${placa.placa}', '${placa.dueno}')">
                    <i class="fab fa-whatsapp"></i> Notificar
                </button>
            </td>
        </tr>
    `;
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
                    <input type="text" id="editPlacaNumero" value="${placa.placa}" required>
                </div>
                <div class="form-group">
                    <label>Dueño</label>
                    <input type="text" id="editPlacaDueno" value="${placa.dueno}" required>
                </div>
                <div class="form-group">
                    <label>Fecha Recepción</label>
                    <input type="date" id="editPlacaFechaRecepcion" value="${placa.fechaRecepcion}" required>
                </div>
                <div class="form-group">
                    <label>Vencimiento SOAT</label>
                    <input type="date" id="editPlacaFechaSoat" value="${placa.fechaVencimientoSOAT || ''}">
                </div>
                <div class="form-group">
                    <label>Vencimiento Tecno</label>
                    <input type="date" id="editPlacaFechaTecno" value="${placa.fechaVencimientoTecno || ''}">
                </div>
                <div class="form-group">
                    <label>Vencimiento Licencia</label>
                    <input type="date" id="editPlacaFechaLicencia" value="${placa.fechaVencimientoLicencia || ''}">
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label>Observaciones</label>
                    <textarea id="editPlacaObservaciones">${placa.observaciones || ''}</textarea>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <button type="submit" class="btn-primary">Guardar Cambios</button>
                <button type="button" class="btn-secondary" onclick="document.getElementById('editModal').style.display='none'">Cancelar</button>
            </div>
        </form>
    `;
    document.getElementById('modalTitle').textContent = 'Editar Placa';
    document.getElementById('modalBody').innerHTML = modalBody;
    document.getElementById('editModal').style.display = 'block';

    document.getElementById('editPlacaForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const updatedPlaca = {
            placa: document.getElementById('editPlacaNumero').value.toUpperCase(),
            dueno: document.getElementById('editPlacaDueno').value,
            fechaRecepcion: document.getElementById('editPlacaFechaRecepcion').value,
            fechaVencimientoSOAT: document.getElementById('editPlacaFechaSoat').value,
            fechaVencimientoTecno: document.getElementById('editPlacaFechaTecno').value,
            fechaVencimientoLicencia: document.getElementById('editPlacaFechaLicencia').value,
            observaciones: document.getElementById('editPlacaObservaciones').value
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

// OTRAS FUNCIONES ÚTILES
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

async function notificarWhatsApp(placa, dueno) {
    const mensaje = `Hola ${dueno}, te notificamos que tienes un trámite de placa pendiente. La placa es: ${placa}.`;
    const numero = '+573212046892'; // Número de teléfono al que se enviará el mensaje
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    
    // Abre una nueva ventana o pestaña con el enlace de WhatsApp
    window.open(url, '_blank');
    mostrarNotificacion('Mensaje de WhatsApp enviado', 'success');
}

// Expone las funciones a la ventana global para que el HTML pueda acceder a ellas.
window.showSection = showSection;
window.cambiarEstadoTramite = cambiarEstadoTramite;
window.cambiarEstadoPago = cambiarEstadoPago;
window.actualizarObservaciones = actualizarObservaciones;
window.editarTramite = editarTramite;
window.eliminarTramite = eliminarTraminar;
window.consultarUtilidades = consultarUtilidades;
window.editarMovimiento = editarMovimiento;
window.eliminarMovimiento = eliminarMovimiento;
window.editarClienteCRM = editarClienteCRM;
window.eliminarClienteCRM = eliminarClienteCRM;
window.notificarWhatsApp = notificarWhatsApp;
window.verificarVencimientos = verificarVencimientos;
window.editarPlaca = editarPlaca;
window.eliminarPlaca = eliminarPlaca;
