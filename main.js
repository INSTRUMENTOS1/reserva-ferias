// main.js
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import {
  getFirestore, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmkzjkDUq-SjBdXB2O23OyFnbV1vbrct4",
  authDomain: "reserva-mesas-bio-boston-97e49.firebaseapp.com",
  projectId: "reserva-mesas-bio-boston-97e49",
  storageBucket: "reserva-mesas-bio-boston-97e49.appspot.com",
  messagingSenderId: "604303272343",
  appId: "1:604303272343:web:9e33b72f67eb49d0a53cd2"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentStep = 0;
let isModificationMode = false;
let modReservationId = null;

const steps = document.querySelectorAll(".step");
const form = document.getElementById("reservaForm");
const mensajeElemento = document.getElementById("mensaje");
const successContainer = document.getElementById("success-container");
const successMessage = document.getElementById("success-message");
const formHeader = document.getElementById("formHeader");
const cancelModificationBtn = document.getElementById("cancelModification");

function showStep(i) {
  steps.forEach((s, index) => s.classList.toggle("active", index === i));
  document.querySelectorAll(".progress div").forEach((el, idx) => el.classList.toggle("active", idx <= i));
}

// Navegación entre pasos
["next-1", "next-2", "next-3"].forEach((id, i) => {
  document.getElementById(id).addEventListener("click", () => {
    if (validateStep(i)) {
      currentStep = i + 1;
      showStep(currentStep);
    }
  });
});
["back-2", "back-3", "back-4"].forEach((id, i) => {
  document.getElementById(id).addEventListener("click", () => {
    currentStep = i;
    showStep(currentStep);
  });
});

function validateStep(i) {
  if (i === 0) return document.getElementById("correo").value && document.getElementById("empresa").value;
  if (i === 1) return document.getElementById("dia").value;
  if (i === 2) return document.getElementById("hora").value;
  return true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const correo = document.getElementById("correo").value.trim();
  const empresa = document.getElementById("empresa").value.trim();
  const dia = document.getElementById("dia").value;
  const hora = document.getElementById("hora").value;
  const mesa = document.querySelector("input[name='mesa']:checked")?.value;

  if (!mesa) {
    mensajeElemento.textContent = "Por favor, selecciona una mesa.";
    mensajeElemento.style.color = "red";
    return;
  }

  const reservasCol = collection(db, "{{COLECCION}}");
  const q = query(reservasCol, where("dia", "==", dia), where("hora", "==", hora), where("mesa", "==", mesa));
  const snapshot = await getDocs(q);

  if (!snapshot.empty && (!isModificationMode || snapshot.docs[0].id !== modReservationId)) {
    mensajeElemento.textContent = `La ${mesa} ya está reservada para el día ${dia} en el tramo ${hora}.`;
    mensajeElemento.style.color = "red";
    return;
  }

  try {
    if (isModificationMode) {
      await updateDoc(doc(db, "{{COLECCION}}", modReservationId), { dia, hora, mesa });
      successMessage.textContent = `Reserva modificada exitosamente para el día ${dia} en el tramo ${hora} en la ${mesa}.`;
    } else {
      await addDoc(reservasCol, { correo, empresa, dia, hora, mesa, createdAt: serverTimestamp() });
      successMessage.textContent = `Reserva realizada exitosamente para el día ${dia} en el tramo ${hora} en la ${mesa}.`;
    }
    form.style.display = "none";
    mensajeElemento.textContent = "";
    successContainer.style.display = "block";
    isModificationMode = false;
    modReservationId = null;
    formHeader.textContent = "Reserva de mesas";
    cancelModificationBtn.style.display = "none";
  } catch (error) {
    console.error("Error:", error);
    mensajeElemento.textContent = "Ocurrió un error. Inténtalo de nuevo.";
    mensajeElemento.style.color = "red";
  }
});

document.getElementById("new-reservation").addEventListener("click", () => {
  form.reset();
  currentStep = 0;
  showStep(currentStep);
  form.style.display = "block";
  successContainer.style.display = "none";
});

document.getElementById("navNueva").addEventListener("click", () => {
  document.getElementById("nuevaReservaContainer").classList.add("active");
  document.getElementById("modificarContainer").classList.remove("active");
});

document.getElementById("navModificar").addEventListener("click", () => {
  document.getElementById("modificarContainer").classList.add("active");
  document.getElementById("nuevaReservaContainer").classList.remove("active");
});

document.getElementById("buscarReservaForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const correo = document.getElementById("correoBusqueda").value;
  const q = query(collection(db, "{{COLECCION}}"), where("correo", "==", correo));
  const snapshot = await getDocs(q);
  const list = document.getElementById("reservasList");
  list.innerHTML = "";
  if (snapshot.empty) {
    list.textContent = "No se encontraron reservas para este correo.";
    return;
  }
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.innerHTML = `
      <p><strong>Correo:</strong> ${data.correo}</p>
      <p><strong>Empresa:</strong> ${data.empresa}</p>
      <p><strong>Día:</strong> ${data.dia}</p>
      <p><strong>Hora:</strong> ${data.hora}</p>
      <p><strong>Mesa:</strong> ${data.mesa}</p>
    `;
    const delBtn = document.createElement("button");
    delBtn.textContent = "Cancelar";
    delBtn.addEventListener("click", async () => {
      if (confirm("¿Desea cancelar esta reserva?")) {
        await deleteDoc(doc(db, "{{COLECCION}}", docSnap.id));
        alert("Reserva cancelada.");
        div.remove();
      }
    });
    div.appendChild(delBtn);
    list.appendChild(div);
  });
});

document.getElementById("descargarCalendario").addEventListener("click", async () => {
  const input = prompt("Introduce tu correo para ver el calendario:");
  if (!input) return;

  const q = input === "instrumentos1.com@gmail.com"
    ? query(collection(db, "{{COLECCION}}"))
    : query(collection(db, "{{COLECCION}}"), where("correo", "==", input));

  const snapshot = await getDocs(q);
  const reservas = snapshot.docs.map(doc => doc.data());

  if (reservas.length === 0) {
    alert("No se encontraron reservas para ese criterio.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();
  docPdf.setFontSize(16);
  docPdf.text("Calendario de Reservas", 14, 20);
  reservas.sort((a, b) => a.dia.localeCompare(b.dia) || a.hora.localeCompare(b.hora));
  const headers = [["Día", "Hora", "Mesa", "Empresa", "Correo"]];
  const rows = reservas.map(r => [r.dia, r.hora, r.mesa, r.empresa, r.correo]);

  docPdf.autoTable({
    startY: 30,
    head: headers,
    body: rows,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [220, 53, 69] },
    margin: { left: 14, right: 14 }
  });

  docPdf.save("calendario_reservas.pdf");
});
