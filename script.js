// Coordenadas aproximadas del centro de General Pacheco
const PACHECO_COORDS = [-34.483, -58.633];
const DEFAULT_ZOOM = 15;

// Datos simulados de árboles
let trees = [
    { id: 1, type: 'palta', lat: -34.480, lng: -58.640, status: 'con', lastUpdated: '2023-10-26', marker: null },
    { id: 2, type: 'pecan', lat: -34.485, lng: -58.630, status: 'sin', lastUpdated: '2023-10-25', marker: null },
    { id: 3, type: 'palta', lat: -34.475, lng: -58.635, status: 'desconocido', lastUpdated: '2023-09-10', marker: null },
    { id: 4, type: 'pecan', lat: -34.490, lng: -58.638, status: 'con', lastUpdated: '2023-10-27', marker: null },
    { id: 5, type: 'palta', lat: -34.488, lng: -58.625, status: 'con', lastUpdated: '2023-10-27', marker: null },
    { id: 6, type: 'pecan', lat: -34.481, lng: -58.645, status: 'desconocido', lastUpdated: '2023-10-01', marker: null },
];

// Estado actual de los filtros
let activeFilters = {
    types: ['pecan', 'palta'],
    statuses: ['con', 'sin', 'desconocido']
};

// Mapa
let map;
// Referencia al árbol actualmente seleccionado/reportado
let currentTree = null;
// Referencia al marcador temporal para añadir árbol (Draggable)
let tempAddTreeMarker = null;


// Referencias a elementos del DOM
const infoModal = document.getElementById('info-modal');
const reportModal = document.getElementById('report-modal');
const addPositionOverlay = document.getElementById('add-position-overlay');
const addTypeModal = document.getElementById('add-type-modal');
const filterModal = document.getElementById('filter-modal');
const sideMenuModal = document.getElementById('side-menu-modal');

const addTreeFab = document.getElementById('add-tree-fab');
const reportStatusBtn = document.getElementById('report-status-btn');
const confirmReportBtn = document.getElementById('confirm-report-btn');
const confirmPositionBtn = document.getElementById('confirm-position-btn');
const saveNewTreeBtn = document.getElementById('save-new-tree-btn');
const filterBtn = document.getElementById('filter-btn');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const menuBtn = document.getElementById('menu-btn');

const closeButtons = document.querySelectorAll('.close-button, .close-modal-btn');


// --- Funciones de Control de Modales ---
function showModal(modalElement) {
    modalElement.classList.remove('hidden');
    document.body.classList.add('modal-open');

    // La interacción del mapa se maneja específicamente por el flujo.
    // Por defecto, si no es el overlay de posicionamiento, se deshabilita.
    if (modalElement !== addPositionOverlay) {
        disableMapInteraction();
    }
    // Si es el overlay de posicionamiento, la interacción ya está habilitada por el flujo de añadir.
}

function hideModal(modalElement) {
    modalElement.classList.add('hidden');
    document.body.classList.remove('modal-open');

    // La re-habilitación de la interacción del mapa se maneja en la lógica específica
    // del flujo de añadir árbol o al cerrar el último modal activo.
    // Para simplificar en un prototipo, re-habilitamos siempre al ocultar *cualquier* modal.
    enableMapInteraction();
}

// Deshabilitar/Habilitar interacción del mapa
function disableMapInteraction() {
     map.dragging.disable();
     map.touchZoom.disable();
     map.doubleClickZoom.disable();
     map.scrollWheelZoom.disable();
     map.boxZoom.disable();
     map.keyboard.disable();
     if (map.tap) map.tap.disable();
}

function enableMapInteraction() {
     map.dragging.enable();
     map.touchZoom.enable();
     map.doubleClickZoom.enable();
     map.scrollWheelZoom.enable();
     map.boxZoom.enable();
     map.keyboard.enable();
     if (map.tap) map.tap.enable();
}


// --- Inicialización del Mapa ---
function initMap() {
    map = L.map('map').setView(PACHECO_COORDS, DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    addMarkers(trees);
    applyFilters();

    enableMapInteraction();
}

// --- Manejo de Marcadores ---
function createCustomIcon(tree) {
     const iconImageUrl = tree.type === 'pecan' ? 'images/pecan-icon.png' : 'images/palta-icon.png';
     const statusClass = tree.status || 'desconocido';

     // Añadir clase si es arrastrable (para estilizar el div interno)
     const draggableClass = tree.isDraggable ? 'is-draggable' : '';

     const iconHTML = `<div class="marker-icon ${statusClass} ${draggableClass}"><img src="${iconImageUrl}" alt="${tree.type}"></div>`;

     return L.divIcon({
         className: 'custom-marker', // Esta clase se añade al elemento padre creado por Leaflet
         html: iconHTML,
         iconSize: [36, 36],
         iconAnchor: [18, 36]
     });
}


function addMarkers(treesArray) {
    treesArray.forEach(tree => {
        if (tree.marker) {
             // Si el marcador ya existe, solo actualiza su icono si es necesario y asegúrate de que esté en el mapa
             tree.marker.setIcon(createCustomIcon(tree));
             if (!map.hasLayer(tree.marker)) {
                  tree.marker.addTo(map);
             }
        } else {
            // Crear un nuevo marcador normal (no arrastrable por defecto)
            const marker = L.marker([tree.lat, tree.lng], {
                icon: createCustomIcon(tree)
            });

            marker.treeData = tree;
            tree.marker = marker;

            marker.addTo(map).on('click', onMarkerClick);
        }
    });
}

function removeAllMarkers() {
     trees.forEach(tree => {
          if (tree.marker && map.hasLayer(tree.marker)) {
               map.removeLayer(tree.marker);
          }
     });
}


function onMarkerClick(e) {
    // Ignorar clics en el marcador temporal arrastrable
    if (tempAddTreeMarker && e.target === tempAddTreeMarker) {
         return;
    }

    currentTree = e.target.treeData;

    document.getElementById('info-tree-type').innerText = currentTree.type === 'pecan' ? 'Nuez Pecan' : 'Palta';
    document.getElementById('info-tree-status').innerText = currentTree.status === 'con' ? 'Tiene frutos' : (currentTree.status === 'sin' ? 'No tiene frutos' : 'Desconocido');
    document.getElementById('info-tree-updated').innerText = currentTree.lastUpdated;
    document.getElementById('info-tree-image').src = 'images/tree-placeholder.jpg';

    showModal(infoModal);
}

// --- Manejo de Reporte ---
reportStatusBtn.addEventListener('click', () => {
    if (currentTree) {
        hideModal(infoModal);
        showModal(reportModal);
        document.querySelectorAll('input[name="fruit_status"]').forEach(radio => radio.checked = false);
    } else {
        console.error("No hay árbol seleccionado para reportar.");
    }
});

confirmReportBtn.addEventListener('click', () => {
    const selectedStatus = document.querySelector('input[name="fruit_status"]:checked')?.value;

    if (selectedStatus && currentTree) {
        currentTree.status = selectedStatus;
        const today = new Date();
        currentTree.lastUpdated = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        console.log(`Reporte recibido para árbol ${currentTree.id}: ${currentTree.status}`);

        if (currentTree.marker) {
             currentTree.marker.setIcon(createCustomIcon(currentTree));
             // Mantener visibilidad según filtros
             if (isTreeVisibleWithFilters(currentTree, activeFilters)) {
                  if (!map.hasLayer(currentTree.marker)) {
                       map.addTo(currentTree.marker); // Usa map.addLayer
                  }
             } else {
                   if (map.hasLayer(currentTree.marker)) {
                       map.removeLayer(currentTree.marker);
                  }
             }
        }

        hideModal(reportModal);
        alert('¡Gracias por tu reporte! El estado ha sido actualizado.');

        currentTree = null;
    } else {
        alert('Por favor, selecciona un estado.');
    }
});

// --- Manejo de Añadir Árbol (con marcador arrastrable) ---
addTreeFab.addEventListener('click', () => {
    // Si ya hay un proceso de añadir en curso, no hacer nada
    if (tempAddTreeMarker) return;

    // 1. Crear un marcador arrastrable en el centro actual del mapa
    const center = map.getCenter();
    // Creamos un objeto temporal similar a un 'tree' para crear el icono, indicando que es arrastrable
    const tempTreeData = {type: 'palta', status: 'desconocido', isDraggable: true}; // Usamos palta/desconocido como temporal
    tempAddTreeMarker = L.marker(center, {
        draggable: true, // Habilita el arrastre
        icon: createCustomIcon(tempTreeData) // Usa el icono personalizado con estilo de draggable
    });

    // 2. Añadirlo al mapa
    tempAddTreeMarker.addTo(map);

    // 3. Mostrar el overlay con las instrucciones y botones (solo el overlay, no el fondo modal completo que deshabilitaría el mapa)
    // showModal ahora maneja la interacción del mapa para este overlay
    showModal(addPositionOverlay);

     // Opcional: centrar el mapa en el marcador
     map.setView(center, map.getZoom());
});

confirmPositionBtn.addEventListener('click', () => {
    if (tempAddTreeMarker) {
        // 1. Obtener las coordenadas finales del marcador arrastrable
        const coords = tempAddTreeMarker.getLatLng();

        // 2. Remover el marcador arrastrable del mapa
        map.removeLayer(tempAddTreeMarker);
        tempAddTreeMarker = null; // Limpiar referencia

        // 3. Ocultar el overlay de posicionamiento
        hideModal(addPositionOverlay); // Esto también re-habilita la interacción del mapa

        // 4. Mostrar el modal de selección de tipo
        showModal(addTypeModal);

        // Guardar coords en el modal de tipo para el paso final
        addTypeModal.tempCoords = coords;

        document.querySelectorAll('input[name="tree_type"]').forEach(radio => radio.checked = false);

    } else {
        console.error("Error: No hay marcador temporal para confirmar.");
        // Si no hay marcador, simplemente ocultar el overlay
        hideModal(addPositionOverlay);
    }
});

saveNewTreeBtn.addEventListener('click', () => {
    const selectedType = document.querySelector('input[name="tree_type"]:checked')?.value;
    const coords = addTypeModal.tempCoords;

    if (selectedType && coords) {
        const newTree = {
            id: trees.length + 1,
            type: selectedType,
            lat: coords.lat,
            lng: coords.lng,
            status: 'desconocido',
            lastUpdated: new Date().toISOString().split('T')[0],
            marker: null
        };

        trees.push(newTree);

         // Añadir el marcador del nuevo árbol si cumple con los filtros actuales
         if (isTreeVisibleWithFilters(newTree, activeFilters)) {
              addMarkers([newTree]);
         }

        console.log('Nuevo árbol añadido:', newTree);

        hideModal(addTypeModal);
        alert('¡Nuevo árbol guardado!');

        addTypeModal.tempCoords = null; // Limpiar
        // La interacción del mapa se re-habilita en hideModal
    } else {
        alert('Por favor, selecciona un tipo de árbol.');
         // Si no se seleccionó tipo, quedarse en el modal de tipo (si hay coords)
         if (coords) {
              showModal(addTypeModal);
         } else {
               // Si no hay coords (esto no debería pasar si el flujo va bien),
               // ocultar el modal de tipo y quizás volver al inicio del flujo de añadir.
               hideModal(addTypeModal);
               // showModal(addPositionOverlay); // Opción: Volver al primer paso
               // La interacción se re-habilita en hideModal
         }
    }
});

// --- Lógica de Filtros ---
filterBtn.addEventListener('click', () => {
     showModal(filterModal);
     // Sincronizar checkboxes con activeFilters actuales
     document.querySelectorAll('#filter-modal input[name="filter_type"]').forEach(cb => {
          cb.checked = activeFilters.types.includes(cb.value);
     });
     document.querySelectorAll('#filter-modal input[name="filter_status"]').forEach(cb => {
          cb.checked = activeFilters.statuses.includes(cb.value);
     });
});

applyFiltersBtn.addEventListener('click', () => {
     const selectedTypes = Array.from(document.querySelectorAll('#filter-modal input[name="filter_type"]:checked')).map(cb => cb.value);
     const selectedStatuses = Array.from(document.querySelectorAll('#filter-modal input[name="filter_status"]:checked')).map(cb => cb.value);

     activeFilters.types = selectedTypes;
     activeFilters.statuses = selectedStatuses;

     applyFilters(); // Re-aplicar filtros a todos los marcadores

     console.log("Filtros aplicados:", activeFilters);

     hideModal(filterModal);
});

// Función para determinar si un árbol debe ser visible con los filtros actuales
function isTreeVisibleWithFilters(tree, filters) {
     const typeMatch = filters.types.includes(tree.type);
     const statusMatch = filters.statuses.includes(tree.status);
     return typeMatch && statusMatch;
}

// Función principal para aplicar filtros (oculta/muestra marcadores)
function applyFilters() {
     trees.forEach(tree => {
          if (tree.marker) { // Solo procesa si el árbol ya tiene un marcador creado
               if (isTreeVisibleWithFilters(tree, activeFilters)) {
                    if (!map.hasLayer(tree.marker)) {
                         tree.marker.addTo(map); // Añade si cumple y no está ya
                    }
               } else {
                    if (map.hasLayer(tree.marker)) {
                         map.removeLayer(tree.marker); // Remueve si no cumple y está en el mapa
                    }
               }
          }
     });
}


// --- Manejo del Menú Lateral ---
menuBtn.addEventListener('click', () => {
     showModal(sideMenuModal);
});


// --- Event Listeners para cerrar modales ---
closeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const modalElement = e.target.closest('.modal');
        if (modalElement) {
            // Ocultar el modal usando la función genérica
            hideModal(modalElement);

            // Lógica específica al cancelar el flujo de añadir árbol desde CUALQUIERA de sus pasos
            if (modalElement.id === 'add-position-overlay' || modalElement.id === 'add-type-modal') {
                 if (tempAddTreeMarker) { // Si el marcador temporal existe, removerlo del mapa
                      map.removeLayer(tempAddTreeMarker);
                      tempAddTreeMarker = null; // Limpiar referencia
                 }
                 addTypeModal.tempCoords = null; // Limpiar coords temporales
            }
            // La interacción del mapa se re-habilita dentro de hideModal()
        }
    });
});


// Opcional: Cerrar modal si se clickea fuera del contenido (excluir el menú lateral)
document.querySelectorAll('.modal:not(.modal-side)').forEach(modal => {
    modal.addEventListener('click', (e) => {
        // Si el click fue directamente en el fondo del modal
        if (e.target === modal) {
            hideModal(modal);

            // Lógica específica al cancelar el flujo de añadir clickeando fuera
             if (modal.id === 'add-position-overlay' || modal.id === 'add-type-modal') {
                 if (tempAddTreeMarker) {
                      map.removeLayer(tempAddTreeMarker);
                      tempAddTreeMarker = null;
                 }
                 addTypeModal.tempCoords = null;
            }
             // La interacción se re-habilita en hideModal
        }
    });
});

// Listener específico para cerrar el menú lateral haciendo clic en el fondo
sideMenuModal.addEventListener('click', (e) => {
     // Si el click es en el fondo del modal-side
     if (e.target === sideMenuModal) {
          hideModal(sideMenuModal);
     }
});


// --- Inicio de la aplicación ---
initMap();