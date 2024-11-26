// Variables principales
const repartidorSelect = document.getElementById('repartidor');
const sucursalSelect = document.getElementById('sucursal');
const remitosListElement = document.getElementById('remitosList');
const codigoQRInput = document.getElementById('codigoQR');
const summaryList = document.getElementById('summaryList');
const deleteSection = document.getElementById('delete-section');
const editRepartidorButton = document.getElementById('editRepartidor');

let remitosDisponibles = [];
let selectedRemitos = [];
let codigoList = [];

// Definición de criterios de clasificación
const classificationCriteria = {
    "1": "Cajas",
    "2": "Cubetas",
    "3": "Refrigerado",
    "4": "Bolsas",
    "5": "Encargado",
    "6": "Varios"
};

// Manejar la selección del repartidor
repartidorSelect.addEventListener('change', function () {
    const ruta = this.options[this.selectedIndex].getAttribute('data-ruta');
    sucursalSelect.innerHTML = '<option value="" disabled selected>Selecciona una sucursal</option>';

    if (ruta) {
        const sucursales = ruta.split(',');
        sucursales.forEach(sucursal => {
            const option = document.createElement('option');
            option.value = sucursal.trim();
            option.textContent = sucursal.trim();
            sucursalSelect.appendChild(option);
        });

        document.getElementById('route-sheet').style.display = 'block';
        repartidorSelect.disabled = true;
        editRepartidorButton.style.display = 'inline-block';
    }
});

// Habilitar edición del repartidor
editRepartidorButton.addEventListener('click', function () {
    if (confirm('¿Estás seguro de que deseas cambiar el repartidor? Esto reiniciará la carga de la hoja de ruta.')) {
        repartidorSelect.disabled = false;
        repartidorSelect.value = '';
        sucursalSelect.innerHTML = '<option value="" disabled selected>Selecciona una sucursal</option>';
        document.getElementById('route-sheet').style.display = 'none';
        document.getElementById('summaryList').innerHTML = '';
        document.getElementById('summary-section').style.display = 'none';
        remitosListElement.innerHTML = '';
        codigoList = [];
        selectedRemitos = [];
    }
});

// Manejar la selección de sucursal
sucursalSelect.addEventListener('change', function () {
    const sucursal = this.value;
    if (sucursal) {
        updateRemitosList(sucursal);
        document.getElementById('remitos-section').style.display = 'block';
    }
});



// Actualizar la lista de remitos
// Actualizar la lista de remitos
// Actualizar la lista de remitos para una sucursal específica
function updateRemitosList(sucursal) {
    remitosListElement.innerHTML = '';
    selectedRemitos = [];

    // Filtrar remitos por sucursal
    const remitosParaSucursal = remitosList.filter(remito =>
        remito.CliApeNom.endsWith(` ${sucursal}`)
    );

    remitosParaSucursal.forEach(remito => {
        const li = document.createElement('li');
        li.innerHTML = `
            <label>
                <input type="checkbox" value="${remito.Numero}" class="remito-checkbox">
                ${remito.Numero} - ${remito.CliApeNom}
            </label>
        `;
        remitosListElement.appendChild(li);
    });

    // Manejar selección de remitos
    document.querySelectorAll('.remito-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                selectedRemitos.push(this.value);
            } else {
                selectedRemitos = selectedRemitos.filter(num => num !== this.value);
            }
        });
    });
}


// Iniciar el escaneo de códigos QR
document.getElementById('startScanning').addEventListener('click', () => {
    document.getElementById('scanning-section').style.display = 'block';
    codigoQRInput.focus();
});

// Escanear códigos QR
codigoQRInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && this.value.trim()) {
        e.preventDefault();
        const codigo = this.value.trim();

        if (codigoList.some(c => c.codigo === codigo)) {
            alert(`El código ${codigo} ya ha sido escaneado.`);createRoute
        } else {
            const tipo = classificationCriteria[codigo.charAt(0)] || "Desconocido";
            codigoList.push({ codigo, tipo });
            const li = document.createElement('li');
            li.innerHTML = `<input type="checkbox" class="codigo-checkbox"> ${codigo} - <strong>${tipo}</strong>`;
            document.getElementById('codigoList').appendChild(li);
        }

        this.value = '';
        this.focus();
        document.getElementById('confirmSucursal').disabled = codigoList.length === 0;
        deleteSection.style.display = 'block';
    }
});

// Confirmar la carga de una sucursal
// Confirmar la carga de una sucursal
document.getElementById('confirmSucursal').addEventListener('click', () => {
    const sucursal = sucursalSelect.value;
    const cantidadBultos = codigoList.length;

    if (selectedRemitos.length === 0) {
        alert('Debe seleccionar al menos un remito.');
        return;
    }

    if (confirm(`¿Desea confirmar la carga para la sucursal ${sucursal}?`)) {
        const li = document.createElement('li');
        li.textContent = `Sucursal ${sucursal}: ${cantidadBultos} códigos escaneados, ${selectedRemitos.length} remitos seleccionados.`;
        summaryList.appendChild(li);

        // Agregar un input hidden con los datos de la sucursal al formulario
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data[]';
        input.value = JSON.stringify({
            sucursal,
            codigos: codigoList.map(c => c.codigo),
            remitos: selectedRemitos
        });
        document.getElementById('routeForm').appendChild(input);

        // Reset de la sucursal
        codigoList = [];
        selectedRemitos = [];
        document.getElementById('codigoList').innerHTML = '';
        remitosListElement.innerHTML = '';
        document.getElementById('scanning-section').style.display = 'none';
        document.getElementById('remitos-section').style.display = 'none';
        sucursalSelect.value = '';
        document.getElementById('summary-section').style.display = 'block';
        deleteSection.style.display = 'none';
    }
});


// Eliminar códigos seleccionados
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
        deleteSection.style.display = 'none';
    }
});

// Finalizar y guardar la hoja de ruta
document.getElementById('finishLoading').addEventListener('click', () => {
    if (confirm('¿Desea guardar la hoja de ruta?')) {
        document.getElementById('routeForm').submit();
    }
});
