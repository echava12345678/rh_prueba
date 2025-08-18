// script.js
// Importa las funciones necesarias del SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

// Espera a que la página se cargue
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa Firebase
    const app = initializeApp(firebaseConfig);
    getAnalytics(app);
    const db = getFirestore(app);
    
    // Cargar datos de Firestore en tiempo real usando onSnapshot
    // Esto asegura que la aplicación se actualice automáticamente cada vez que los datos cambien.
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
    verificarVencimientos(db);
    setInterval(() => verificarVencimientos(db), 3600000);

    // Muestra la sección inicial
    showSection('tramites');
});

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
        if (btn.getAttribute('onclick').includes(sectionId)) {
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
        const db = getFirestore(initializeApp(firebaseConfig));
        await updateDoc(doc(db, 'tramites', id), { estado: nuevoEstado });
        mostrarNotificacion('Estado del trámite actualizado', 'success');
    } catch (error) {
        console.error("Error al actualizar el estado: ", error);
        mostrarNotificacion('Error al actualizar el estado del trámite', 'error');
    }
}

async function cambiarEstadoPago(id, nuevoPago) {
    try {
        const db = getFirestore(initializeApp(firebaseConfig));
        await updateDoc(doc(db, 'tramites', id), { pago: nuevoPago });
        mostrarNotificacion('Estado de pago actualizado', 'success');
    } catch (error) {
        console.error("Error al actualizar el pago: ", error);
        mostrarNotificacion('Error al actualizar el estado de pago', 'error');
    }
}

async function actualizarObservaciones(id, observaciones) {
    try {
        const db = getFirestore(initializeApp(firebaseConfig));
        await updateDoc(doc(db, 'tramites', id), { observaciones: observaciones });
    } catch (error) {
        console.error("Error al actualizar las observaciones: ", error);
    }
}

async function editarTramite(id) {
    const db = getFirestore(initializeApp(firebaseConfig));
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
            const db = getFirestore(initializeApp(firebaseConfig));
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
    const db = getFirestore(initializeApp(firebaseConfig));
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
            const db = getFirestore(initializeApp(firebaseConfig));
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
                                ${new Date(cliente.venceSOAT).toLocaleDateString()}
                                ${soatVencimiento <= 30 && soatVencimiento >= 0 ? '<span class="alerta-vencimiento">¡Próximo a vencer!</span>' : ''}
                            </td>
                            <td>
                                ${new Date(cliente.venceRTM).toLocaleDateString()}
                                ${rtmVencimiento <= 30 && rtmVencimiento >= 0 ? '<span class="alerta-vencimiento">¡Próximo a vencer!</span>' : ''}
                            </td>
                            <td>
                                <span class="cant-avisos cant-avisos-${Math.min(cliente.cantidadAvisos, 3)}">
                                    ${cliente.cantidadAvisos}
                                </span>
                            </td>
                            <td>
                                <button class="btn-edit" onclick="editarClienteCRM('${cliente.id}')">Editar</button>
                                <button class="btn-delete" onclick="eliminarClienteCRM('${cliente.id}')">Eliminar</button>
                                <button class="btn-whatsapp" onclick="notificarWhatsApp('${cliente.id}', '${cliente.telefono}', '${cliente.propietario}', '${cliente.placa}', '${cliente.venceSOAT}', '${cliente.venceRTM}')">Notificar WhatsApp</button>
                                <button class="btn-email" onclick="notificarEmail('${cliente.id}')">Notificar Email</button>
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
        const db = getFirestore(initializeApp(firebaseConfig));
        const docRef = doc(db, 'clientesCRM', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const cliente = docSnap.data();
            const newAvisos = (cliente.cantidadAvisos || 0) + 1;
            await updateDoc(docRef, { cantidadAvisos: newAvisos });
        }
        
        const vencimientoSOAT = new Date(venceSOAT).toLocaleDateString();
        const vencimientoRTM = new Date(venceRTM).toLocaleDateString();
        const mensaje = `¡Hola ${propietario}! Te recordamos que el SOAT de tu vehículo con placa ${placa} vence el ${vencimientoSOAT} y la RTM vence el ${vencimientoRTM}. ¡Contáctanos para renovarlos!`;
        const mensajeCodificado = encodeURIComponent(mensaje);
        const url = `https://api.whatsapp.com/send?phone=${telefono}&text=${mensajeCodificado}`;
        window.open(url, '_blank');
    } catch (error) {
        console.error("Error al notificar por WhatsApp: ", error);
        mostrarNotificacion('Error al enviar la notificación', 'error');
    }
}

async function notificarEmail(id) {
    const db = getFirestore(initializeApp(firebaseConfig));
    const docRef = doc(db, 'clientesCRM', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        mostrarNotificacion('Cliente no encontrado.', 'error');
        return;
    }
    const cliente = { id, ...docSnap.data() };
    if (!cliente.correo) {
        mostrarNotificacion('El cliente no tiene un correo registrado.', 'error');
        return;
    }

    const diasSOAT = calcularDiasVencimiento(cliente.venceSOAT);
    const diasRTM = calcularDiasVencimiento(cliente.venceRTM);

    let notificacionEnviada = false;

    if (diasSOAT > 0 && diasSOAT <= 30) {
        const emailSent = await enviarNotificacionVencimiento(cliente, 'SOAT', diasSOAT);
        if (emailSent) notificacionEnviada = true;
    }
    if (diasRTM > 0 && diasRTM <= 30) {
        const emailSent = await enviarNotificacionVencimiento(cliente, 'RTM', diasRTM);
        if (emailSent) notificacionEnviada = true;
    }

    if (notificacionEnviada) {
        const newAvisos = (cliente.cantidadAvisos || 0) + 1;
        await updateDoc(docRef, { cantidadAvisos: newAvisos });
        mostrarNotificacion(`Email enviado a ${cliente.correo} y contador de avisos actualizado.`, 'success');
    } else {
        mostrarNotificacion('Ningún documento de este cliente está próximo a vencer.', 'info');
    }
}

async function enviarNotificacionVencimiento(cliente, documento, dias) {
    const asuntoEmail = `Vencimiento ${documento} - Placa ${cliente.placa}`;
    const cuerpoEmail = `Estimado/a ${cliente.propietario},\n\nSu ${documento} del vehículo con placa ${cliente.placa} vence en ${dias} día${dias > 1 ? 's' : ''}.\n\nFecha de vencimiento: ${new Date(documento === 'SOAT' ? cliente.venceSOAT : cliente.venceRTM).toLocaleDateString()}\n\nPor favor, renuévelo a tiempo para evitar inconvenientes.\n\nSaludos cordiales.`;

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
        
        let notificacionEnviada = false;

        // Verificar si el SOAT vence en 7 días o menos y no ha pasado la fecha
        if (diasSOAT <= 7 && diasSOAT >= 0 && !localStorage.getItem(keySOAT)) {
            const emailSent = await enviarNotificacionVencimiento(cliente, 'SOAT', diasSOAT);
            if (emailSent) {
                localStorage.setItem(keySOAT, true);
                avisosEnviados++;
                notificacionEnviada = true;
            }
        }
        
        // Verificar si la RTM vence en 7 días o menos y no ha pasado la fecha
        if (diasRTM <= 7 && diasRTM >= 0 && !localStorage.getItem(keyRTM)) {
            const emailSent = await enviarNotificacionVencimiento(cliente, 'RTM', diasRTM);
            if (emailSent) {
                localStorage.setItem(keyRTM, true);
                avisosEnviados++;
                notificacionEnviada = true;
            }
        }
        
        if (notificacionEnviada) {
            const docRef = doc(db, 'clientesCRM', cliente.id);
            const newAvisos = (cliente.cantidadAvisos || 0) + 1;
            await updateDoc(docRef, { cantidadAvisos: newAvisos });
        }
    }

    if (avisosEnviados > 0) {
        mostrarNotificacion(`Se han enviado ${avisosEnviados} avisos de vencimiento por correo electrónico.`, 'info');
    }
}

async function editarClienteCRM(id) {
    const db = getFirestore(initializeApp(firebaseConfig));
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
            const db = getFirestore(initializeApp(firebaseConfig));
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

function actualizarTablaPlacas() {
    const container = document.getElementById('tablaPlacas');
    if (!container) return;
    if (!placas || placas.length === 0) {
        container.innerHTML = '<p>No hay placas registradas.</p>';
        return;
    }

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
                ${placas.map(p => {
                    const estado = obtenerEstadoPlaca(p.fechaAsignada, p.fechaMatricula, p.asignadaA);
                    return `
                    <tr>
                        <td>${p.placa}</td>
                        <td>${p.asignadaA || 'N/A'}</td>
                        <td>${p.fechaRecepcion ? new Date(p.fechaRecepcion).toLocaleDateString() : 'N/A'}</td>
                        <td>${p.fechaAsignada ? new Date(p.fechaAsignada).toLocaleDateString() : 'N/A'}</td>
                        <td>${p.fechaMatricula ? new Date(p.fechaMatricula).toLocaleDateString() : 'N/A'}</td>
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
    const db = getFirestore(initializeApp(firebaseConfig));
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
            const db = getFirestore(initializeApp(firebaseConfig));
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

// Expone las funciones a la ventana global para que el HTML pueda acceder a ellas.
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
window.notificarEmail = notificarEmail;
window.agregarTramite = agregarTramite;
window.agregarMovimiento = agregarMovimiento;
window.agregarClienteCRM = agregarClienteCRM;
window.registrarPlaca = registrarPlaca;
