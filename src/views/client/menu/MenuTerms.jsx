// src/views/client/menu/MenuTerms.jsx
// Términos y Condiciones (FORMATO GENERAL): numeración en naranja de
// marca, texto plano sin emojis. Los textos legales son los aprobados
// en R1a — no editarlos sin pedirlo el dueño.
import { BRAND_ORANGE } from '../../../constants/styles';
import { SectionHeader } from './menuUi';

const SECS = [
  {
    title: 'OBJETO',
    body: 'Los presentes Términos y Condiciones regulan el uso del programa de fidelización Puntos Plus ("el Programa"), disponible a través de la aplicación web progresiva accesible en puntos-plus.vercel.app, y la relación entre el operador del Programa y el usuario. Puntos Plus es una plataforma de fidelización independiente en la que Gasolineras Turkaj I, II y III de Chichicastenango participan como comercio afiliado. Al acceder y utilizar el Programa, el usuario acepta expresamente haber leído, comprendido y adherirse a los presentes términos, así como a las leyes vigentes de la República de Guatemala.',
  },
  {
    title: 'DESCRIPCIÓN DEL PROGRAMA',
    body: 'Puntos Plus es un programa de lealtad que permite a los clientes de las estaciones afiliadas (Gasolineras Turkaj I, II y III en Chichicastenango, Guatemala) acumular puntos por compras de combustible y canjearlos por premios, descuentos y beneficios exclusivos. La participación en el Programa es voluntaria y gratuita.',
  },
  {
    title: 'INDEPENDENCIA DE MARCA',
    body: 'Puntos Plus es una aplicación y plataforma ajena a Shell Guatemala. El Programa no es operado, patrocinado ni avalado por Shell Guatemala ni por sus franquiciantes, y aplica únicamente en las gasolineras Turkaj de Chichicastenango. Las marcas de terceros visibles en las estaciones pertenecen a sus respectivos titulares.',
  },
  {
    title: 'REGISTRO Y MEMBRESÍA',
    body: 'Para participar en el Programa, el usuario debe registrarse proporcionando su nombre completo, Documento Personal de Identificación (DPI), número de teléfono y fecha de nacimiento. El usuario garantiza que la información proporcionada es verídica y exacta. Cada persona física puede tener una única cuenta activa. El Programa se reserva el derecho de suspender cuentas con información incorrecta o duplicadas.',
  },
  {
    title: 'ACUMULACIÓN DE PUNTOS',
    body: 'Los puntos se acumulan a razón de 1 punto por cada Q10.00 de combustible comprado en las estaciones afiliadas Turkaj I, II y III. Los puntos se asignan al momento de registrar la compra mediante el código QR personal del miembro. El Programa puede otorgar puntos adicionales en eventos especiales, días festivos o aniversarios, según lo determine en cada momento. Los puntos no tienen valor monetario y no son transferibles entre miembros.',
  },
  {
    title: 'NIVELES DE MEMBRESÍA',
    body: 'El Programa cuenta con tres niveles basados en el consumo acumulado de galones: ORO (0 a 149 galones), PLATINO (150 a 499 galones) y BLACK (500 galones o más). Cada nivel otorga beneficios diferenciados incluyendo descuentos en canje de premios. El nivel se calcula automáticamente con base en el historial de compras registradas en el Programa.',
  },
  {
    title: 'CANJE DE PUNTOS',
    body: 'Los puntos acumulados pueden canjearse por premios del catálogo disponible en la aplicación, sujetos a disponibilidad. El canje requiere la confirmación del miembro a través de la aplicación y la presencia física del miembro en la estación al momento de recibir el premio. Los premios canjeados no son reembolsables ni transferibles. Los miembros PLATINO y BLACK reciben descuentos del 10% y 15% respectivamente sobre el costo en puntos de los premios.',
  },
  {
    title: 'RIFA MENSUAL',
    body: 'Cada mes el Programa realiza una rifa entre los miembros participantes. Los boletos de rifa tienen un costo de 5 puntos cada uno. La participación en la rifa es voluntaria. El ganador se determina de forma aleatoria entre los boletos adquiridos para ese mes. Los puntos utilizados en la compra de boletos no son reembolsables en ningún caso.',
  },
  {
    title: 'INACTIVIDAD Y DEGRADACIÓN',
    body: 'El Programa monitorea la actividad de los miembros. La inactividad prolongada puede resultar en la degradación del nivel del miembro o la pérdida de puntos acumulados, según las reglas de inactividad vigentes disponibles en la sección correspondiente de la aplicación. Las reglas de inactividad pueden modificarse con previo aviso al miembro a través de la aplicación.',
  },
  {
    title: 'PRIVACIDAD Y PROTECCIÓN DE DATOS',
    body: 'Puntos Plus recopila y procesa los datos personales del usuario con el único fin de operar el Programa de fidelización. Los datos no serán vendidos, cedidos ni compartidos con terceros sin consentimiento del usuario, salvo obligación legal. El usuario puede solicitar la eliminación de su cuenta y datos en cualquier momento a través de los canales de contacto del Programa.',
  },
  {
    title: 'MODIFICACIONES AL PROGRAMA',
    body: 'El Programa se reserva el derecho de modificar, suspender o cancelar sus beneficios, reglas o catálogo de premios en cualquier momento. Los cambios serán notificados a través de la aplicación. El uso continuado del Programa después de la notificación de cambios implica la aceptación de los mismos por parte del usuario.',
  },
  {
    title: 'PROPIEDAD INTELECTUAL',
    body: 'La aplicación Puntos Plus, su diseño, marca, logotipos, contenidos y código fuente son propiedad exclusiva de la plataforma Puntos Plus. Las marcas y nombres comerciales de las estaciones afiliadas (Gasolineras Turkaj) y de terceros pertenecen a sus respectivos titulares. El usuario no podrá reproducir, copiar, distribuir ni modificar ningún elemento de la aplicación sin autorización expresa y por escrito.',
  },
  {
    title: 'LIMITACIÓN DE RESPONSABILIDAD',
    body: 'El Programa no será responsable por fallas técnicas de la aplicación, interrupciones del servicio, pérdida de datos por causas de fuerza mayor o cualquier perjuicio indirecto derivado del uso del Programa. La responsabilidad máxima del Programa frente al usuario se limita al valor en puntos de los beneficios directamente afectados.',
  },
  {
    title: 'JURISDICCIÓN',
    body: 'Los presentes Términos y Condiciones se rigen por las leyes de la República de Guatemala. Cualquier controversia derivada de su interpretación o cumplimiento será sometida a los tribunales competentes del municipio de Chichicastenango, Quiché, Guatemala, renunciando las partes a cualquier otro fuero que pudiere corresponderles.',
  },
  {
    title: 'CONTACTO',
    body: 'Para consultas, reclamos o solicitudes relacionadas con el Programa, el usuario puede comunicarse en cualquiera de las tres estaciones afiliadas ubicadas en Chichicastenango, Guatemala, o a través de los canales de contacto habilitados en la aplicación.',
  },
];

export default function MenuTerms({ TH, onBack }) {
  return (
    <>
      <SectionHeader title="Términos y Condiciones" sub="Aplica en Gasolineras Turkaj, Chichicastenango" onBack={onBack} TH={TH} />
      {SECS.map((s, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: BRAND_ORANGE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            {String(i + 1).padStart(2, '0')}. {s.title}
          </div>
          <div style={{ fontSize: 13, color: TH.text, lineHeight: 1.7 }}>
            {s.body}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 16, background: TH.surface }}>
        <div style={{ fontSize: 11, color: TH.sub, textAlign: 'center', lineHeight: 1.6 }}>
          Al utilizar Puntos Plus aceptás estos términos y condiciones.<br />
          Última actualización: Julio 2026
        </div>
      </div>
    </>
  );
}
