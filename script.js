document.addEventListener('DOMContentLoaded', function() {
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
        measurementId: "G-TJW55F..."
    };

    // Inicializa Firebase
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Referencias a colecciones
    const tramitesCol = collection(db, "tramites");
    const contabilidadCol = collection(db, "contabilidad");
    const crmCol = collection(db, "clientes_crm");
    const placasCol = collection(db, "placas");

    // Referencias a elementos del DOM
    const tramiteForm = document.getElementById('tramiteForm');
    const tramiteClienteInput = document.getElementById('tramiteCliente');
    const tramitesProcesoDiv = document.getElementById('tramitesProceso');
    const tramitesTerminadosDiv = document.getElementById('tramitesTerminados');
    const tramitesPorCobrarDiv = document.getElementById('tramitesPorCobrar');
    const tramitesRechazadosDiv = document.getElementById('tramitesRechazados');
    const valorTramiteDiv = document.getElementById('valorTramiteDiv');
    const tramitePagoSelect = document.getElementById('tramitePago');
    const tramiteEstadoSelect = document.getElementById('tramiteEstado');
    const contabilidadForm = document.getElementById('contabilidadForm');
    const crmForm = document.getElementById('crmForm');
    const placasForm = document.getElementById('placasForm');
    const tablaPlacasDiv = document.getElementById('tablaPlacas');

    // Notificaciones
    function mostrarNotificacion(mensaje, tipo = 'success') {
        const notificacion = document.getElementById('notificacion');
        notificacion.textContent = mensaje;
        notificacion.className = 'notificacion ' + tipo;
        notificacion.style.display = 'block';
        notificacion.style.opacity = '1';

        setTimeout(() => {
            notificacion.style.opacity = '0';
            setTimeout(() => notificacion.style.display = 'none', 500);
        }, 3000);
    }

    // Modal
    const editModal = document.getElementById('editModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeModal = document.querySelector('.close');

    closeModal.onclick = function() {
        editModal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == editModal) {
            editModal.style.display = 'none';
        }
    }

    // Funciones de navegación
    function showSection(sectionId) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
        }

        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => btn.classList.remove('active'));
        document.getElementById(`btn${capitalizeFirstLetter(sectionId)}`).classList.add('active');
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    document.getElementById('btnTramites').addEventListener('click', () => showSection('tramites'));
    document.getElementById('btnContabilidad').addEventListener('click', () => showSection('contabilidad'));
    document.getElementById('btnCRM').addEventListener('click', () => showSection('crm'));
    document.getElementById('btnPlacas').addEventListener('click', () => showSection('placas'));
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Lógica de autenticación
    function setupPageContent() {
        showSection('tramites');
        setupRealtimeListeners();
    }

    onAuthStateChanged(auth, (user) => {
        const loginPanel = document.getElementById('loginPanel');
        const appContainer = document.getElementById('appContainer');

        if (user) {
            loginPanel.classList.remove('active');
            appContainer.classList.remove('hidden');
            setupPageContent();
        } else {
            loginPanel.classList.add('active');
            appContainer.classList.add('hidden');
        }
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            mostrarNotificacion('¡Inicio de sesión exitoso!', 'success');
        } catch (error) {
            console.error(error);
            mostrarNotificacion('Error en el inicio de sesión. Credenciales incorrectas.', 'error');
        }
    });

    function handleLogout() {
        signOut(auth).then(() => {
            mostrarNotificacion('Has cerrado sesión.', 'info');
        }).catch(error => {
            console.error("Error al cerrar sesión: ", error);
        });
    }

    // Sección de Trámites
    tramitePagoSelect.addEventListener('change', (e) => {
        if (e.target.value === 'pagado') {
            valorTramiteDiv.style.display = 'block';
        } else {
            valorTramiteDiv.style.display = 'none';
        }
    });

    tramiteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevoTramite = {
            fecha: tramiteForm.tramiteFecha.value,
            cliente: tramiteForm.tramiteCliente.value,
            placa: tramiteForm.tramitePlaca.value,
            nit: tramiteForm.tramiteNit.value,
            tipo: tramiteForm.tramiteTipo.value,
            transito: tramiteForm.tramiteTransito.value,
            estado: tramiteForm.tramiteEstado.value,
            pago: tramiteForm.tramitePago.value,
            valor: tramiteForm.tramitePago.value === 'pagado' ? Number(tramiteForm.tramiteValor.value) : 0,
            observaciones: ""
        };

        try {
            await addDoc(tramitesCol, nuevoTramite);
            mostrarNotificacion('Trámite agregado con éxito.', 'success');
            tramiteForm.reset();
        } catch (err) {
            console.error("Error al agregar documento: ", err);
            mostrarNotificacion('Error al agregar el trámite.', 'error');
        }
    });

    function renderTramites(data) {
        tramitesProcesoDiv.innerHTML = '';
        tramitesTerminadosDiv.innerHTML = '';
        tramitesPorCobrarDiv.innerHTML = '';
        tramitesRechazadosDiv.innerHTML = '';

        data.forEach(tramite => {
            const tramiteCard = document.createElement('div');
            tramiteCard.className = 'tramite-card';
            tramiteCard.innerHTML = `
                <h4>${tramite.cliente} - ${tramite.placa}</h4>
                <p><strong>Trámite:</strong> ${tramite.tipo}</p>
                <p><strong>Fecha:</strong> ${tramite.fecha}</p>
                <p><strong>Tránsito:</strong> ${tramite.transito}</p>
                <p><strong>Estado:</strong> <span class="estado-${tramite.estado}">${capitalizeFirstLetter(tramite.estado)}</span></p>
                <p><strong>Pago:</strong> <span class="pago-${tramite.pago}">${capitalizeFirstLetter(tramite.pago)}</span></p>
                ${tramite.valor > 0 ? `<p><strong>Valor:</strong> $${tramite.valor.toLocaleString()}</p>` : ''}
                ${tramite.nit ? `<p><strong>NIT:</strong> ${tramite.nit}</p>` : ''}
                ${tramite.observaciones ? `<p><strong>Observaciones:</strong> ${tramite.observaciones}</p>` : ''}
                <div class="card-actions">
                    <button class="btn-secondary" onclick="editarTramite('${tramite.id}')">Editar</button>
                    <button class="btn-whatsapp" onclick="notificarWhatsApp('${tramite.id}')"><i class="fab fa-whatsapp"></i></button>
                    <button class="btn-secondary" onclick="descargarReciboTramite('${tramite.id}')">Descargar Recibo</button>
                    <button class="btn-secondary" onclick="eliminarTramite('${tramite.id}')">Eliminar</button>
                </div>
            `;

            switch (tramite.estado) {
                case 'proceso':
                    tramitesProcesoDiv.appendChild(tramiteCard);
                    break;
                case 'terminado':
                    tramitesTerminadosDiv.appendChild(tramiteCard);
                    break;
                case 'rechazado':
                    tramitesRechazadosDiv.appendChild(tramiteCard);
                    break;
            }
            if (tramite.pago === 'pendiente' && tramite.estado !== 'rechazado') {
                tramitesPorCobrarDiv.appendChild(tramiteCard);
            }
        });
    }

    async function descargarReciboTramite(tramiteId) {
        try {
            const docRef = doc(db, "tramites", tramiteId);
            const tramiteDoc = await getDoc(docRef);
            if (!tramiteDoc.exists()) {
                throw new Error("No se encontró el trámite");
            }
            const tramite = tramiteDoc.data();

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="padding: 20px; font-family: 'Poppins', sans-serif;">
                    <h2 style="text-align: center; color: #f50d05;">RH Asesorías</h2>
                    <h3 style="text-align: center;">Recibo de Trámite</h3>
                    <hr style="border: 1px solid #f57c00; margin-top: 10px; margin-bottom: 20px;">
                    <p><strong>Fecha:</strong> ${tramite.fecha}</p>
                    <p><strong>Cliente:</strong> ${tramite.cliente}</p>
                    <p><strong>Placa:</strong> ${tramite.placa}</p>
                    <p><strong>NIT:</strong> ${tramite.nit || 'N/A'}</p>
                    <p><strong>Tipo de Trámite:</strong> ${tramite.tipo}</p>
                    <p><strong>Tránsito:</strong> ${tramite.transito}</p>
                    <p><strong>Estado de Pago:</strong> ${capitalizeFirstLetter(tramite.pago)}</p>
                    <p><strong>Valor:</strong> $${tramite.valor.toLocaleString()}</p>
                    <p><strong>Observaciones:</strong> ${tramite.observaciones || 'Sin observaciones'}</p>
                    <div style="margin-top: 50px; text-align: center;">
                        <p style="font-style: italic; color: #777;">Gracias por preferir nuestros servicios.</p>
                        <p style="font-size: 12px; color: #555;">Documento generado automáticamente.</p>
                    </div>
                </div>
            `;
            
            await html2canvas(element, { scale: 2 }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 210;
                const pageHeight = 297;
                const imgHeight = canvas.height * imgWidth / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;
                
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                
                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    doc.addPage();
                    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                
                doc.save(`Recibo_${tramite.cliente}_${tramite.placa}.pdf`);
                mostrarNotificacion('Recibo generado con éxito.', 'success');
            });

        } catch (error) {
            console.error("Error al generar el recibo:", error);
            mostrarNotificacion('Error al generar el recibo.', 'error');
        }
    }

    async function eliminarTramite(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este trámite?')) return;
        try {
            await deleteDoc(doc(db, "tramites", id));
            mostrarNotificacion('Trámite eliminado con éxito.', 'success');
        } catch (error) {
            console.error("Error al eliminar documento: ", error);
            mostrarNotificacion('Error al eliminar el trámite.', 'error');
        }
    }

    function editarTramite(id) {
        const tramite = tramites.find(t => t.id === id);
        if (!tramite) return;

        modalTitle.textContent = `Editar Trámite de ${tramite.cliente}`;
        modalBody.innerHTML = `
            <form id="editTramiteForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="editTramiteFecha">Fecha</label>
                        <input type="date" id="editTramiteFecha" value="${tramite.fecha}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTramiteCliente">Cliente</label>
                        <input type="text" id="editTramiteCliente" value="${tramite.cliente}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTramitePlaca">Placa</label>
                        <input type="text" id="editTramitePlaca" value="${tramite.placa}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTramiteNit">NIT</label>
                        <input type="text" id="editTramiteNit" value="${tramite.nit || ''}">
                    </div>
                    <div class="form-group">
                        <label for="editTramiteTipo">Tipo de Trámite</label>
                        <input type="text" id="editTramiteTipo" value="${tramite.tipo}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTramiteTransito">Tránsito</label>
                        <input type="text" id="editTramiteTransito" value="${tramite.transito}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTramiteEstado">Estado</label>
                        <select id="editTramiteEstado" required>
                            <option value="proceso" ${tramite.estado === 'proceso' ? 'selected' : ''}>En Proceso</option>
                            <option value="terminado" ${tramite.estado === 'terminado' ? 'selected' : ''}>Terminado</option>
                            <option value="rechazado" ${tramite.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editTramitePago">Estado de Pago</label>
                        <select id="editTramitePago" required>
                            <option value="pendiente" ${tramite.pago === 'pendiente' ? 'selected' : ''}>Por Cobrar</option>
                            <option value="pagado" ${tramite.pago === 'pagado' ? 'selected' : ''}>Pagado</option>
                        </select>
                    </div>
                    <div class="form-group" id="editValorTramiteDiv" style="${tramite.pago === 'pagado' ? 'display: block;' : 'display: none;'}">
                        <label for="editTramiteValor">Valor</label>
                        <input type="number" id="editTramiteValor" value="${tramite.valor || 0}" min="0">
                    </div>
                    <div class="form-group" style="grid-column: span 2;">
                        <label for="editTramiteObservaciones">Observaciones</label>
                        <textarea id="editTramiteObservaciones">${tramite.observaciones || ''}</textarea>
                    </div>
                </div>
                <button type="submit" class="btn-primary">Guardar Cambios</button>
            </form>
        `;

        const editValorTramiteDiv = document.getElementById('editValorTramiteDiv');
        document.getElementById('editTramitePago').addEventListener('change', (e) => {
            if (e.target.value === 'pagado') {
                editValorTramiteDiv.style.display = 'block';
            } else {
                editValorTramiteDiv.style.display = 'none';
            }
        });

        const editTramiteForm = document.getElementById('editTramiteForm');
        editTramiteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tramiteRef = doc(db, "tramites", id);
            const updatedData = {
                fecha: editTramiteForm.editTramiteFecha.value,
                cliente: editTramiteForm.editTramiteCliente.value,
                placa: editTramiteForm.editTramitePlaca.value,
                nit: editTramiteForm.editTramiteNit.value,
                tipo: editTramiteForm.editTramiteTipo.value,
                transito: editTramiteForm.editTramiteTransito.value,
                estado: editTramiteForm.editTramiteEstado.value,
                pago: editTramiteForm.editTramitePago.value,
                valor: editTramiteForm.editTramitePago.value === 'pagado' ? Number(editTramiteForm.editTramiteValor.value) : 0,
                observaciones: editTramiteForm.editTramiteObservaciones.value
            };

            try {
                await updateDoc(tramiteRef, updatedData);
                mostrarNotificacion('Trámite actualizado con éxito.', 'success');
                editModal.style.display = 'none';
            } catch (error) {
                console.error("Error al actualizar documento: ", error);
                mostrarNotificacion('Error al actualizar el trámite.', 'error');
            }
        });

        editModal.style.display = 'block';
    }

    function notificarWhatsApp(id) {
        const tramite = tramites.find(t => t.id === id);
        if (!tramite) {
            mostrarNotificacion('Trámite no encontrado para notificar.', 'error');
            return;
        }

        const telefono = '573132039985'; // Reemplaza con el número de teléfono
        const mensaje = `Hola, ${tramite.cliente}. Te escribimos de RH Asesorías para informarte que tu trámite de ${tramite.tipo} para la placa ${tramite.placa} en ${tramite.transito} ha sido ${tramite.estado === 'terminado' ? 'completado' : 'rechazado'}. El estado de pago es ${tramite.pago === 'pagado' ? 'pagado' : 'por cobrar'}. Valor: $${tramite.valor.toLocaleString()}. Cualquier duda, contáctanos.`;
        const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    }

    // Sección de Contabilidad
    contabilidadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevoMovimiento = {
            fecha: contabilidadForm.contaFecha.value,
            cliente: contabilidadForm.contaCliente.value,
            banco: contabilidadForm.contaBanco.value,
            tipo: contabilidadForm.contaTipo.value,
            monto: Number(contabilidadForm.contaMonto.value),
            createdAt: new Date()
        };
        try {
            await addDoc(contabilidadCol, nuevoMovimiento);
            mostrarNotificacion('Movimiento registrado con éxito.', 'success');
            contabilidadForm.reset();
        } catch (err) {
            console.error("Error al registrar movimiento: ", err);
            mostrarNotificacion('Error al registrar movimiento.', 'error');
        }
    });

    function renderRegistrosContables(data, filtro = 'todos') {
        const registrosContablesDiv = document.getElementById('registrosContables');
        registrosContablesDiv.innerHTML = '';
        
        const filteredData = filtro === 'todos' ? data : data.filter(mov => mov.tipo === filtro);
        
        if (filteredData.length === 0) {
            registrosContablesDiv.innerHTML = '<p style="text-align: center; color: #777;">No hay movimientos para mostrar.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'styled-table';
        table.innerHTML = `
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
                ${filteredData.map(mov => `
                    <tr>
                        <td>${mov.fecha}</td>
                        <td>${mov.cliente}</td>
                        <td>${capitalizeFirstLetter(mov.banco)}</td>
                        <td><span class="${mov.tipo === 'ingreso' ? 'pago-pagado' : 'estado-rechazado'}">${capitalizeFirstLetter(mov.tipo)}</span></td>
                        <td>$${mov.monto.toLocaleString()}</td>
                        <td class="table-actions">
                            <button onclick="editarMovimiento('${mov.id}')">Editar</button>
                            <button class="btn-delete" onclick="eliminarMovimiento('${mov.id}')">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        registrosContablesDiv.appendChild(table);
    }

    function actualizarRegistrosContables() {
        const filtro = document.getElementById('filtroMovimiento').value;
        renderRegistrosContables(registrosContables, filtro);
    }

    async function eliminarMovimiento(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este movimiento?')) return;
        try {
            await deleteDoc(doc(db, "contabilidad", id));
            mostrarNotificacion('Movimiento eliminado con éxito.', 'success');
        } catch (error) {
            console.error("Error al eliminar movimiento: ", error);
            mostrarNotificacion('Error al eliminar movimiento.', 'error');
        }
    }

    async function consultarUtilidades() {
        const fecha = document.getElementById('fechaConsulta').value;
        const persona = document.getElementById('personaConsulta').value;
        const resultadosDiv = document.getElementById('resultadosUtilidad');
        resultadosDiv.innerHTML = '<p>Calculando...</p>';

        if (!fecha) {
            mostrarNotificacion('Por favor, selecciona una fecha.', 'error');
            resultadosDiv.innerHTML = '';
            return;
        }

        try {
            const movimientosRef = collection(db, "contabilidad");
            const snapshot = await getDocs(movimientosRef);
            
            let ingresos = 0;
            let egresos = 0;

            snapshot.forEach(doc => {
                const mov = doc.data();
                if (mov.fecha === fecha && (persona === '' || mov.banco === persona)) {
                    if (mov.tipo === 'ingreso') {
                        ingresos += mov.monto;
                    } else if (mov.tipo === 'egreso') {
                        egresos += mov.monto;
                    }
                }
            });

            const utilidad = ingresos - egresos;
            resultadosDiv.innerHTML = `
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Ingresos:</strong> <span style="color: green;">$${ingresos.toLocaleString()}</span></p>
                <p><strong>Egresos:</strong> <span style="color: red;">$${egresos.toLocaleString()}</span></p>
                <p><strong>Utilidad Neta:</strong> <span style="color: ${utilidad >= 0 ? 'green' : 'red'};">$${utilidad.toLocaleString()}</span></p>
            `;
        } catch (error) {
            console.error("Error al consultar utilidades: ", error);
            mostrarNotificacion('Error al consultar utilidades.', 'error');
            resultadosDiv.innerHTML = '<p>Error al cargar los datos.</p>';
        }
    }

    function editarMovimiento(id) {
        const movimiento = registrosContables.find(m => m.id === id);
        if (!movimiento) return;

        modalTitle.textContent = 'Editar Movimiento';
        modalBody.innerHTML = `
            <form id="editMovimientoForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="editContaFecha">Fecha:</label>
                        <input type="date" id="editContaFecha" value="${movimiento.fecha}" required>
                    </div>
                    <div class="form-group">
                        <label for="editContaCliente">Cliente:</label>
                        <input type="text" id="editContaCliente" value="${movimiento.cliente}" required>
                    </div>
                    <div class="form-group">
                        <label for="editContaBanco">Banco / Efectivo:</label>
                        <select id="editContaBanco" required>
                            <option value="victor" ${movimiento.banco === 'victor' ? 'selected' : ''}>Banco de Víctor</option>
                            <option value="maira" ${movimiento.banco === 'maira' ? 'selected' : ''}>Banco de Maira</option>
                            <option value="efectivo" ${movimiento.banco === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editContaTipo">Tipo:</label>
                        <select id="editContaTipo" required>
                            <option value="ingreso" ${movimiento.tipo === 'ingreso' ? 'selected' : ''}>Ingreso</option>
                            <option value="egreso" ${movimiento.tipo === 'egreso' ? 'selected' : ''}>Egreso</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editContaMonto">Monto:</label>
                        <input type="number" id="editContaMonto" value="${movimiento.monto}" required>
                    </div>
                </div>
                <button type="submit" class="btn-primary">Guardar Cambios</button>
            </form>
        `;

        const editMovimientoForm = document.getElementById('editMovimientoForm');
        editMovimientoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const movimientoRef = doc(db, "contabilidad", id);
            const updatedData = {
                fecha: editMovimientoForm.editContaFecha.value,
                cliente: editMovimientoForm.editContaCliente.value,
                banco: editMovimientoForm.editContaBanco.value,
                tipo: editMovimientoForm.editContaTipo.value,
                monto: Number(editMovimientoForm.editContaMonto.value),
            };

            try {
                await updateDoc(movimientoRef, updatedData);
                mostrarNotificacion('Movimiento actualizado con éxito.', 'success');
                editModal.style.display = 'none';
            } catch (error) {
                console.error("Error al actualizar movimiento: ", error);
                mostrarNotificacion('Error al actualizar el movimiento.', 'error');
            }
        });

        editModal.style.display = 'block';
    }

    // Sección de CRM
    crmForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevoCliente = {
            cliente: crmForm.crmCliente.value,
            placa: crmForm.crmPlaca.value,
            propietario: crmForm.crmPropietario.value,
            cedula: crmForm.crmCedula.value,
            telefono: crmForm.crmTelefono.value,
            correo: crmForm.crmCorreo.value,
            venceSOAT: crmForm.crmVenceSOAT.value,
            venceRTM: crmForm.crmVenceRTM.value,
            createdAt: new Date()
        };
        try {
            await addDoc(crmCol, nuevoCliente);
            mostrarNotificacion('Cliente agregado con éxito.', 'success');
            crmForm.reset();
        } catch (err) {
            console.error("Error al agregar cliente: ", err);
            mostrarNotificacion('Error al agregar cliente.', 'error');
        }
    });

    function renderClientesCRM(data) {
        const tablaCRMDiv = document.getElementById('tablaCRM');
        tablaCRMDiv.innerHTML = '';

        if (data.length === 0) {
            tablaCRMDiv.innerHTML = '<p style="text-align: center; color: #777;">No hay clientes para mostrar.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'styled-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Placa</th>
                    <th>Propietario</th>
                    <th>Teléfono</th>
                    <th>Vencimiento SOAT</th>
                    <th>Vencimiento RTM</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(cliente => `
                    <tr>
                        <td>${cliente.cliente}</td>
                        <td>${cliente.placa}</td>
                        <td>${cliente.propietario}</td>
                        <td>${cliente.telefono}</td>
                        <td>${cliente.venceSOAT} <span style="font-weight: bold; color: ${checkVencimiento(cliente.venceSOAT)}">(${checkVencimiento(cliente.venceSOAT) === 'red' ? 'Vencido' : 'OK'})</span></td>
                        <td>${cliente.venceRTM} <span style="font-weight: bold; color: ${checkVencimiento(cliente.venceRTM)}">(${checkVencimiento(cliente.venceRTM) === 'red' ? 'Vencido' : 'OK'})</span></td>
                        <td class="table-actions">
                            <button onclick="editarClienteCRM('${cliente.id}')">Editar</button>
                            <button class="btn-delete" onclick="eliminarClienteCRM('${cliente.id}')">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        tablaCRMDiv.appendChild(table);
    }

    function checkVencimiento(fecha) {
        const today = new Date();
        const venceDate = new Date(fecha);
        return venceDate < today ? 'red' : 'green';
    }
    
    async function eliminarClienteCRM(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;
        try {
            await deleteDoc(doc(db, "clientes_crm", id));
            mostrarNotificacion('Cliente eliminado con éxito.', 'success');
        } catch (error) {
            console.error("Error al eliminar cliente: ", error);
            mostrarNotificacion('Error al eliminar cliente.', 'error');
        }
    }

    function editarClienteCRM(id) {
        const cliente = clientesCRM.find(c => c.id === id);
        if (!cliente) return;

        modalTitle.textContent = `Editar Cliente ${cliente.cliente}`;
        modalBody.innerHTML = `
            <form id="editCrmForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="editCrmCliente">Nombre de Cliente:</label>
                        <input type="text" id="editCrmCliente" value="${cliente.cliente}" required>
                    </div>
                    <div class="form-group">
                        <label for="editCrmPlaca">Placa:</label>
                        <input type="text" id="editCrmPlaca" value="${cliente.placa}" required>
                    </div>
                    <div class="form-group">
                        <label for="editCrmPropietario">Propietario:</label>
                        <input type="text" id="editCrmPropietario" value="${cliente.propietario}" required>
                    </div>
                    <div class="form-group">
                        <label for="editCrmCedula">Cédula:</label>
                        <input type="text" id="editCrmCedula" value="${cliente.cedula}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editCrmTelefono">Teléfono:</label>
                        <input type="tel" id="editCrmTelefono" value="${cliente.telefono}" required>
                    </div>
                    <div class="form-group">
                        <label for="editCrmCorreo">Correo:</label>
                        <input type="email" id="editCrmCorreo" value="${cliente.correo || ''}">
                    </div>
                    <div class="form-group">
                        <label for="editCrmVenceSOAT">Vence SOAT:</label>
                        <input type="date" id="editCrmVenceSOAT" value="${cliente.venceSOAT}" required>
                    </div>
                    <div class="form-group">
                        <label for="editCrmVenceRTM">Vence RTM:</label>
                        <input type="date" id="editCrmVenceRTM" value="${cliente.venceRTM}" required>
                    </div>
                </div>
                <button type="submit" class="btn-primary">Guardar Cambios</button>
            </form>
        `;

        const editCrmForm = document.getElementById('editCrmForm');
        editCrmForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clienteRef = doc(db, "clientes_crm", id);
            const updatedData = {
                cliente: editCrmForm.editCrmCliente.value,
                placa: editCrmForm.editCrmPlaca.value,
                propietario: editCrmForm.editCrmPropietario.value,
                cedula: editCrmForm.editCrmCedula.value,
                telefono: editCrmForm.editCrmTelefono.value,
                correo: editCrmForm.editCrmCorreo.value,
                venceSOAT: editCrmForm.editCrmVenceSOAT.value,
                venceRTM: editCrmForm.editCrmVenceRTM.value
            };

            try {
                await updateDoc(clienteRef, updatedData);
                mostrarNotificacion('Cliente actualizado con éxito.', 'success');
                editModal.style.display = 'none';
            } catch (error) {
                console.error("Error al actualizar cliente: ", error);
                mostrarNotificacion('Error al actualizar el cliente.', 'error');
            }
        });

        editModal.style.display = 'block';
    }

    // Sección de Placas
    placasForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevaPlaca = {
            placaInicial: placasForm.placaInicial.value.toUpperCase(),
            placaFinal: placasForm.placaFinal.value.toUpperCase(),
            asignadaA: placasForm.placaAsignadaA.value,
            fechaRecepcion: placasForm.placaFechaRecepcion.value,
            fechaAsignada: placasForm.placaFechaAsignada.value,
            fechaMatricula: placasForm.placaFechaMatricula.value,
            observaciones: placasForm.placaObservaciones.value,
            createdAt: new Date()
        };
        try {
            await addDoc(placasCol, nuevaPlaca);
            mostrarNotificacion('Rango de placas registrado con éxito.', 'success');
            placasForm.reset();
        } catch (err) {
            console.error("Error al registrar rango de placas: ", err);
            mostrarNotificacion('Error al registrar el rango de placas.', 'error');
        }
    });

    function renderPlacas(data) {
        const tablaPlacasDiv = document.getElementById('tablaPlacas');
        tablaPlacasDiv.innerHTML = '';

        if (data.length === 0) {
            tablaPlacasDiv.innerHTML = '<p style="text-align: center; color: #777;">No hay placas para mostrar.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'styled-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Placa Inicial</th>
                    <th>Placa Final</th>
                    <th>Asignada a</th>
                    <th>Fecha Recepción</th>
                    <th>Fecha Asignada</th>
                    <th>Fecha Matrícula</th>
                    <th>Observaciones</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(placa => `
                    <tr>
                        <td>${placa.placaInicial}</td>
                        <td>${placa.placaFinal}</td>
                        <td>${placa.asignadaA}</td>
                        <td>${placa.fechaRecepcion}</td>
                        <td>${placa.fechaAsignada || 'N/A'}</td>
                        <td>${placa.fechaMatricula || 'N/A'}</td>
                        <td>${placa.observaciones || 'N/A'}</td>
                        <td class="table-actions">
                            <button onclick="editarPlaca('${placa.id}')">Editar</button>
                            <button class="btn-delete" onclick="eliminarPlaca('${placa.id}')">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        tablaPlacasDiv.appendChild(table);
    }

    async function eliminarPlaca(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este registro de placa?')) return;
        try {
            await deleteDoc(doc(db, "placas", id));
            mostrarNotificacion('Registro de placa eliminado con éxito.', 'success');
        } catch (error) {
            console.error("Error al eliminar placa: ", error);
            mostrarNotificacion('Error al eliminar el registro de placa.', 'error');
        }
    }

    function editarPlaca(id) {
        const placa = placas.find(p => p.id === id);
        if (!placa) return;

        modalTitle.textContent = `Editar Placa ${placa.placaInicial}`;
        modalBody.innerHTML = `
            <form id="editPlacaForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="editPlacaInicial">Placa Inicial:</label>
                        <input type="text" id="editPlacaInicial" value="${placa.placaInicial}" required>
                    </div>
                    <div class="form-group">
                        <label for="editPlacaFinal">Placa Final:</label>
                        <input type="text" id="editPlacaFinal" value="${placa.placaFinal}" required>
                    </div>
                    <div class="form-group">
                        <label for="editPlacaAsignadaA">Asignada a:</label>
                        <input type="text" id="editPlacaAsignadaA" value="${placa.asignadaA || ''}">
                    </div>
                    <div class="form-group">
                        <label for="editPlacaFechaRecepcion">Fecha de Recepción:</label>
                        <input type="date" id="editPlacaFechaRecepcion" value="${placa.fechaRecepcion}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editPlacaFechaAsignada">Fecha Asignada:</label>
                        <input type="date" id="editPlacaFechaAsignada" value="${placa.fechaAsignada || ''}">
                    </div>
                    <div class="form-group">
                        <label for="editPlacaFechaMatricula">Fecha Matrícula:</label>
                        <input type="date" id="editPlacaFechaMatricula" value="${placa.fechaMatricula || ''}">
                    </div>
                    <div class="form-group" style="grid-column: span 2;">
                        <label for="editPlacaObservaciones">Observaciones:</label>
                        <textarea id="editPlacaObservaciones">${placa.observaciones || ''}</textarea>
                    </div>
                </div>
                <button type="submit" class="btn-primary">Guardar Cambios</button>
            </form>
        `;

        const editPlacaForm = document.getElementById('editPlacaForm');
        editPlacaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const placaRef = doc(db, "placas", id);
            const updatedData = {
                placaInicial: editPlacaForm.editPlacaInicial.value.toUpperCase(),
                placaFinal: editPlacaForm.editPlacaFinal.value.toUpperCase(),
                asignadaA: editPlacaForm.editPlacaAsignadaA.value,
                fechaRecepcion: editPlacaForm.editPlacaFechaRecepcion.value,
                fechaAsignada: editPlacaForm.editPlacaFechaAsignada.value,
                fechaMatricula: editPlacaForm.editPlacaFechaMatricula.value,
                observaciones: editPlacaForm.editPlacaObservaciones.value
            };

            try {
                await updateDoc(placaRef, updatedData);
                mostrarNotificacion('Placa actualizada con éxito.', 'success');
                editModal.style.display = 'none';
            } catch (error) {
                console.error("Error al actualizar placa: ", error);
                mostrarNotificacion('Error al actualizar el registro de placa.', 'error');
            }
        });

        editModal.style.display = 'block';
    }


    // Escucha en tiempo real de la base de datos
    function setupRealtimeListeners() {
        onSnapshot(tramitesCol, (snapshot) => {
            tramites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTramites(tramites);
        });

        onSnapshot(contabilidadCol, (snapshot) => {
            registrosContables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            actualizarRegistrosContables();
        });

        onSnapshot(crmCol, (snapshot) => {
            clientesCRM = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderClientesCRM(clientesCRM);
        });

        onSnapshot(placasCol, (snapshot) => {
            placas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderPlacas(placas);
        });
    }

    // Expone las funciones a la ventana global para que el HTML pueda acceder a ellas.
    window.descargarReciboTramite = descargarReciboTramite;
    window.showSection = showSection;
    window.editarTramite = editarTramite;
    window.eliminarTramite = eliminarTramite;
    window.notificarWhatsApp = notificarWhatsApp;
    window.consultarUtilidades = consultarUtilidades;
    window.editarMovimiento = editarMovimiento;
    window.eliminarMovimiento = eliminarMovimiento;
    window.editarClienteCRM = editarClienteCRM;
    window.eliminarClienteCRM = eliminarClienteCRM;
    window.editarPlaca = editarPlaca;
    window.eliminarPlaca = eliminarPlaca;
    window.actualizarRegistrosContables = actualizarRegistrosContables;
});
