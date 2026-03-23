// ABOUTME: Privacy policy page for Nove Health.
// ABOUTME: Required for Garmin Connect IQ integration and general compliance.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nove — Política de Privacidad",
  robots: "noindex",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-8 text-3xl font-bold">Política de Privacidad</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Última actualización: 20 de marzo de 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold">1. Información que recopilamos</h2>
          <p>
            Al usar Nove, podemos recopilar la siguiente información:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Datos de cuenta:</strong> nombre, correo electrónico y método de autenticación.</li>
            <li><strong>Datos de salud:</strong> resultados de laboratorio, biomarcadores, perfil de salud y objetivos que nos proporcionas voluntariamente.</li>
            <li><strong>Datos de wearables:</strong> actividad física, sueño, frecuencia cardíaca y estrés sincronizados desde dispositivos como Garmin, con tu autorización explícita.</li>
            <li><strong>Datos de uso:</strong> interacciones con la plataforma, conversaciones con el coach de IA y preferencias.</li>
            <li><strong>Datos de marketing:</strong> correo electrónico, parámetros UTM y página de origen cuando te registras en nuestro sitio.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Cómo usamos tu información</h2>
          <p>Usamos tu información para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Interpretar tus resultados de laboratorio y biomarcadores.</li>
            <li>Generar recomendaciones personalizadas a través de nuestro coach de IA.</li>
            <li>Correlacionar datos de wearables con tus biomarcadores.</li>
            <li>Mejorar nuestros servicios y la experiencia del usuario.</li>
            <li>Comunicarnos contigo sobre tu cuenta y actualizaciones del servicio.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Datos de salud</h2>
          <p>
            Tus datos de salud son información sensible y los tratamos con el más alto nivel de protección:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Tus datos de salud están encriptados en tránsito y en reposo.</li>
            <li>Solo procesamos datos de salud con tu consentimiento explícito.</li>
            <li>No vendemos ni compartimos tus datos de salud con terceros para fines publicitarios.</li>
            <li>Puedes solicitar la eliminación completa de tus datos en cualquier momento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Inteligencia artificial</h2>
          <p>
            Nove utiliza modelos de inteligencia artificial para interpretar tus datos y generar recomendaciones.
            Tus datos pueden ser procesados por proveedores de IA (como Anthropic y Google) bajo acuerdos estrictos de confidencialidad.
            Estos proveedores no retienen ni usan tus datos para entrenar sus modelos.
          </p>
          <p>
            Las recomendaciones del coach de IA son informativas y no constituyen diagnóstico ni consejo médico profesional.
            Siempre consulta a un profesional de salud para decisiones médicas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Integraciones con terceros</h2>
          <p>
            Nove se integra con los siguientes servicios con tu autorización:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Garmin:</strong> sincronización de datos de actividad, sueño y frecuencia cardíaca. Puedes desconectar en cualquier momento.</li>
            <li><strong>Laboratorios partners:</strong> recepción de resultados de laboratorio. Solo se comparte tu código de orden, nunca tu identidad directamente.</li>
            <li><strong>Google OAuth:</strong> autenticación de tu cuenta.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Almacenamiento y seguridad</h2>
          <p>
            Tus datos se almacenan en servidores seguros con encriptación.
            Implementamos medidas técnicas y organizativas para proteger tu información contra acceso no autorizado, pérdida o alteración.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Tus derechos</h2>
          <p>Tienes derecho a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Acceder a tus datos personales.</li>
            <li>Solicitar la corrección de datos inexactos.</li>
            <li>Solicitar la eliminación de tus datos.</li>
            <li>Revocar tu consentimiento en cualquier momento.</li>
            <li>Exportar tus datos en un formato portable.</li>
          </ul>
          <p>
            Para ejercer estos derechos, contáctanos en <strong>privacidad@nove.health</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Cookies y analítica</h2>
          <p>
            Usamos cookies y herramientas de analítica (como Google Analytics) para mejorar nuestro servicio y medir la efectividad de nuestras campañas.
            Puedes desactivar las cookies en tu navegador en cualquier momento.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta política periódicamente. Te notificaremos de cambios significativos por correo electrónico o a través de la plataforma.
            El uso continuado del servicio constituye aceptación de la política actualizada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Contacto</h2>
          <p>
            Si tienes preguntas sobre esta política, contáctanos en <strong>privacidad@nove.health</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
