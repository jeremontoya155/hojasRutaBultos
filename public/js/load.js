

const repartidorSelect = document.getElementById('repartidor');
const sucursalSelect = document.getElementById('sucursal');
const codigoQRInput = document.getElementById('codigoQR');
let codigoList = [];
const summaryList = document.getElementById('summaryList');
const deleteSection = document.getElementById('delete-section');
const editRepartidorButton = document.getElementById('editRepartidor');

const classificationCriteria = {
    "1": "Cajas",
    "2": "Cubetas",
    "3": "Refrigerado",
    "4": "Bolsas",
    "5": "Encargado",
    "6": "Varios"
};

repartidorSelect.addEventListener('change', function() {
    const ruta = this.options[this.selectedIndex].getAttribute('data-ruta');
    sucursalSelect.innerHTML = '<option value="" disabled selected>Selecciona una sucursal</option>';

    if (ruta) {
        const sucursales = ruta.split(',');
        sucursales.forEach(sucursal => {
            const option = document.createElement('option');
            option.value = sucursal;
            option.textContent = sucursal;
            sucursalSelect.appendChild(option);
        });

        document.getElementById('route-sheet').style.display = 'block';
        repartidorSelect.disabled = true; // Fijar repartidor
        editRepartidorButton.style.display = 'inline-block'; // Mostrar botón de editar

        // Crear un input hidden para almacenar el repartidor en el formulario
        const repartidorInput = document.createElement('input');
        repartidorInput.type = 'hidden';
        repartidorInput.name = 'repartidor';
        repartidorInput.value = repartidorSelect.value;
        document.getElementById('routeForm').appendChild(repartidorInput);
    }
});

// Funcionalidad para editar repartidor
editRepartidorButton.addEventListener('click', function() {
    if (confirm('¿Estás seguro de que deseas cambiar el repartidor? Esto reiniciará la carga de la hoja de ruta.')) {
        repartidorSelect.disabled = false;
        repartidorSelect.value = '';
        sucursalSelect.innerHTML = '<option value="" disabled selected>Selecciona una sucursal</option>';
        document.getElementById('route-sheet').style.display = 'none';
        document.getElementById('summaryList').innerHTML = '';
        document.getElementById('summary-section').style.display = 'none';
        codigoList = [];

        // Remover el input hidden del repartidor
        const repartidorInput = document.querySelector('input[name="repartidor"]');
        if (repartidorInput) {
            repartidorInput.remove();
        }
    }
});

document.getElementById('startScanning').addEventListener('click', () => {
    document.getElementById('scanning-section').style.display = 'block';
    codigoQRInput.focus();
});

// Verificar códigos duplicados en la misma sucursal
codigoQRInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && this.value.trim()) {
        e.preventDefault();
        const codigo = this.value.trim();

        if (codigoList.some(c => c.codigo === codigo)) {
            alert(`El código ${codigo} ya ha sido escaneado para esta sucursal.`);
        } else {
            const tipo = classificationCriteria[codigo.charAt(0)] || "Desconocido";
            codigoList.push({codigo, tipo});
            const li = document.createElement('li');
            li.innerHTML = `<input type="checkbox" class="codigo-checkbox"> ${codigo} - <strong>${tipo}</strong>`;
            document.getElementById('codigoList').appendChild(li);
        }

        this.value = '';
        this.focus();
        document.getElementById('confirmSucursal').disabled = codigoList.length === 0;
        deleteSection.style.display = 'block'; // Mostrar la sección de eliminar cuando haya códigos
    }
});

document.getElementById('confirmSucursal').addEventListener('click', () => {
    const sucursal = sucursalSelect.value;
    const cantidadBultos = codigoList.length;

    // Resumen por tipo
    const resumenTipos = {};
    codigoList.forEach(c => {
        if (resumenTipos[c.tipo]) {
            resumenTipos[c.tipo]++;
        } else {
            resumenTipos[c.tipo] = 1;
        }
    });

    if (confirm(`¿Desea confirmar la carga para la sucursal ${sucursal}?`)) {
        const li = document.createElement('li');
        li.textContent = `Sucursal ${sucursal}: ${cantidadBultos} códigos escaneados.`;
        summaryList.appendChild(li);

        // Mostrar resumen por tipo
        const resumenDiv = document.createElement('div');
        resumenDiv.innerHTML = `<strong>Desglose:</strong> ${Object.entries(resumenTipos).map(([tipo, cantidad]) => `${tipo}: ${cantidad}`).join(', ')}`;
        summaryList.appendChild(resumenDiv);

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data[]';
        input.value = JSON.stringify({ sucursal: sucursal, codigos: codigoList.map(c => c.codigo) });
        document.getElementById('routeForm').appendChild(input);

        codigoList = [];
        document.getElementById('codigoList').innerHTML = '';
        document.getElementById('scanning-section').style.display = 'none';
        document.getElementById('route-sheet').style.display = 'block';
        sucursalSelect.value = '';
        document.getElementById('summary-section').style.display = 'block';
        document.getElementById('confirmSucursal').disabled = true;
        deleteSection.style.display = 'none'; // Ocultar la sección de eliminar después de confirmar
    }
});

// Función para eliminar los códigos seleccionados
document.getElementById('deleteSelected').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.codigo-checkbox:checked');
    checkboxes.forEach(checkbox => {
        const li = checkbox.parentElement;
        const codigo = li.textContent.split(' - ')[0].trim();
        codigoList = codigoList.filter(c => c.codigo !== codigo);
        li.remove();
    });
    document.getElementById('confirmSucursal').disabled = codigoList.length === 0;
    if (codigoList.length === 0) {
        deleteSection.style.display = 'none'; // Ocultar la sección de eliminar si no hay códigos
    }
});

document.getElementById('finishLoading').addEventListener('click', () => {
    if (confirm('¿Desea guardar la hoja de ruta?')) {
        document.getElementById('routeForm').submit();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Aplicar el efecto de fade-in cuando la página se carga
    document.body.classList.add('fade-in');

    // Función para aplicar fade-out y redirigir a la nueva página
    function applyFadeOutAndRedirect(url) {
        document.body.classList.add('fade-out');
        setTimeout(() => {
            window.location.href = url;
        }, 1000); // Debe coincidir con la duración de la transición en CSS
    }

    // Asignar el evento de click al botón de "Cargar Hoja de Ruta"
    const loadRouteButton = document.querySelector('.tab-buttons button');
    if (loadRouteButton) {
        loadRouteButton.addEventListener('click', (e) => {
            e.preventDefault();
            applyFadeOutAndRedirect(loadRouteButton.getAttribute('onclick').split("'")[1]);
        });
    }

    // Añadir el mismo efecto a otros enlaces de navegación si es necesario
    document.querySelectorAll('a').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            applyFadeOutAndRedirect(anchor.href);
        });
    });
});