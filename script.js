/**
 * RE-JAL Protocol Management Module
 * Este archivo contiene la lógica de negocio para la captura y exportación 
 * de protocolos de la Secretaría de Salud Jalisco.
 */

const { jsPDF } = window.jspdf;

// Configuración de IDs y Etiquetas
const FIELD_IDS = ['titulo', 'planteamiento', 'objetivoGeneral', 'disenoSelect', 'metodos', 'institucion', 'folio', 'financiamiento'];
const LABELS = {
    titulo: "1. Título",
    planteamiento: "2. Planteamiento del problema",
    objetivoGeneral: "3. Objetivo general",
    disenoSelect: "4. Diseño",
    metodos: "5. Métodos",
    institucion: "6. Institución a implementar",
    folio: "7. Número de aprobación",
    financiamiento: "8. Financiamiento",
    conflicto: "9. Conflicto de Interés"
};

// Datos de Objetivos de Desarrollo Sostenible
const ODS_LIST = [
    { n: 1, t: "Fin de la pobreza", c: "#E5243B" }, { n: 2, t: "Hambre cero", c: "#DDA63A" },
    { n: 3, t: "Salud y bienestar", c: "#4C9F38" }, { n: 4, t: "Educación de calidad", c: "#C5192D" },
    { n: 5, t: "Igualdad de género", c: "#FF3A21" }, { n: 6, t: "Agua limpia", c: "#26BDE2" },
    { n: 7, t: "Energía asequible", c: "#FCC30B" }, { n: 8, t: "Trabajo decente", c: "#A21942" },
    { n: 9, t: "Industria e innovación", c: "#FD6925" }, { n: 10, t: "Reducción desigualdades", c: "#DD1367" },
    { n: 11, t: "Ciudades sostenibles", c: "#FD9D24" }, { n: 12, t: "Consumo responsable", c: "#BF8B2E" },
    { n: 13, t: "Acción por el clima", c: "#3F7E44" }, { n: 14, t: "Vida submarina", c: "#0A97D9" },
    { n: 15, t: "Vida terrestre", c: "#56C02B" }, { n: 16, t: "Paz y justicia", c: "#00689D" },
    { n: 17, t: "Alianzas", c: "#19486A" }
];

/**
 * Muestra notificaciones tipo Toast
 */
function showToast(message, type = "success") {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

/**
 * Guarda el progreso actual en LocalStorage
 */
function saveToLocalStorage() {
    const data = {};
    FIELD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });

    const statusEl = document.getElementById('conflictoStatus');
    const detalleEl = document.getElementById('conflictoDetalle');
    if (statusEl) data['conflictoStatus'] = statusEl.value;
    if (detalleEl) data['conflictoDetalle'] = detalleEl.value;

    data['ods'] = Array.from(document.querySelectorAll('.ods-item.selected')).map(el => el.dataset.n);
    localStorage.setItem('protocoloDraft_SSJ', JSON.stringify(data));
}

/**
 * Carga datos previos si existen
 */
function loadFromLocalStorage() {
    const saved = localStorage.getItem('protocoloDraft_SSJ');
    if (!saved) return;

    try {
        const data = JSON.parse(saved);
        FIELD_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el && data[id]) el.value = data[id];
        });

        const statusEl = document.getElementById('conflictoStatus');
        const detalleEl = document.getElementById('conflictoDetalle');

        if (data['conflictoStatus'] && statusEl) {
            statusEl.value = data['conflictoStatus'];
            if (detalleEl) {
                detalleEl.style.display = data['conflictoStatus'] === 'Si existe conflicto' ? 'block' : 'none';
                detalleEl.value = data['conflictoDetalle'] || '';
            }
        }

        if (data['ods']) {
            data['ods'].forEach(n => {
                const el = document.querySelector(`.ods-item[data-n="${n}"]`);
                if (el) {
                    const odsMatch = ODS_LIST.find(o => o.n == parseInt(n));
                    el.classList.add('selected');
                    el.style.backgroundColor = odsMatch.c;
                }
            });
        }
        if (data['titulo']) showToast("Borrador recuperado correctamente");
    } catch (e) {
        console.error("Error al cargar el borrador:", e);
    }
}

/**
 * Convierte el logo de URL a Base64 para jsPDF
 */
async function getLogoAsBase64(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
    });
}

/**
 * Genera el documento PDF final
 */
async function generateProtocolPDF() {
    const titulo = document.getElementById('titulo').value.trim();
    const diseno = document.getElementById('disenoSelect').value;

    if (!titulo || !diseno) {
        showToast("Por favor llena el título y el diseño de estudio", "error");
        return;
    }

    document.getElementById('loadingOverlay').style.display = 'flex';
    
    const doc = new jsPDF();
    const margin = 25;
    let cursorY = 55;

    const logo = await getLogoAsBase64("https://portalesmuli.s3.amazonaws.com/ssj/original_images/LogoSalud.png");
    if (logo) doc.addImage(logo, 'PNG', 160, 15, 25, 20);

    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text("Salud", margin, 25);
    
    doc.setTextColor(0).setFontSize(11);
    doc.text("Registro Estatal de Protocolos del Estado de Jalisco", 105, 40, { align: 'center' });

    const checkPageBreak = (heightNeeded) => {
        if (cursorY + heightNeeded > 275) {
            doc.addPage();
            cursorY = 25;
        }
    };

    // Iterar campos
    [...FIELD_IDS, 'conflicto'].forEach(id => {
        let textValue = "";
        if (id === 'conflicto') {
            const s = document.getElementById('conflictoStatus');
            const d = document.getElementById('conflictoDetalle');
            textValue = s.value === 'Si existe conflicto' ? d.value : s.value;
        } else {
            textValue = document.getElementById(id).value || "N/A";
        }

        const lines = doc.splitTextToSize(textValue, 160);
        checkPageBreak(12 + (lines.length * 5));

        doc.setFontSize(9).setFont("helvetica", "bold");
        doc.text(LABELS[id] || id, margin, cursorY);
        cursorY += 6;
        doc.setFontSize(10).setFont("helvetica", "normal");
        doc.text(lines, margin, cursorY);
        cursorY += (lines.length * 5) + 8;
    });

    // Agregar ODS al final del PDF
    checkPageBreak(30);
    doc.setFontSize(9).setFont("helvetica", "bold");
    doc.text("10. Objetivos de Desarrollo Sostenible:", margin, cursorY);
    cursorY += 10;

    const selectedODS = Array.from(document.querySelectorAll('.ods-item.selected')).map(el => parseInt(el.dataset.n));
    let xPos = margin;
    
    selectedODS.forEach(num => {
        const data = ODS_LIST.find(o => o.n === num);
        if (data) {
            if (xPos > 160) { xPos = margin; cursorY += 12; checkPageBreak(15); }
            doc.setFillColor(data.c);
            doc.rect(xPos, cursorY - 5, 8, 8, 'F');
            doc.setTextColor(255); doc.setFontSize(6);
            doc.text(data.n.toString(), xPos + 4, cursorY, { align: 'center' });
            doc.setTextColor(0); doc.setFontSize(7);
            doc.text(data.t.substring(0, 20), xPos + 10, cursorY);
            xPos += 45;
        }
    });

    document.getElementById('loadingOverlay').style.display = 'none';
    doc.save(`Protocolo_SSJ_${new Date().getTime()}.pdf`);
    showToast("PDF generado con éxito");
}
