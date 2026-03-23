// ABOUTME: Terms of service page for Nove Health.
// ABOUTME: Covers subscription, health disclaimers, and acceptable use.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nove — Términos de Servicio",
  robots: "noindex",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-8 text-3xl font-bold">Términos de Servicio</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Última actualización: 20 de marzo de 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold">1. Aceptación de los términos</h2>
          <p>
            Al crear una cuenta o usar Nove, aceptas estos Términos de Servicio y nuestra{" "}
            <a href="/privacy" className="underline">Política de Privacidad</a>.
            Si no estás de acuerdo, no uses el servicio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Descripción del servicio</h2>
          <p>
            Nove es una plataforma de salud preventiva que ofrece:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Análisis e interpretación de resultados de laboratorio mediante inteligencia artificial.</li>
            <li>Coaching personalizado de salud a través de un asistente de IA.</li>
            <li>Integración con dispositivos wearable (Garmin) para monitoreo de actividad.</li>
            <li>Seguimiento longitudinal de biomarcadores.</li>
            <li>Coordinación con laboratorios partners certificados en LATAM.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Suscripción y pagos</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>El acceso a Nove requiere una suscripción anual de <strong>$350 USD</strong>.</li>
            <li>La suscripción incluye acceso a la plataforma, interpretación de laboratorios por IA y coaching personalizado.</li>
            <li>Los costos de laboratorio se pagan directamente al laboratorio partner y no están incluidos en la suscripción, salvo que se indique lo contrario.</li>
            <li>La suscripción se renueva automáticamente al final del periodo. Puedes cancelar en cualquier momento antes de la renovación.</li>
            <li>No ofrecemos reembolsos por periodos parciales de suscripción.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Aviso de salud importante</h2>
          <p>
            <strong>Nove no es un sustituto de atención médica profesional.</strong>
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Las interpretaciones y recomendaciones del coach de IA son informativas y educativas.</li>
            <li>No constituyen diagnóstico médico, tratamiento ni consejo médico profesional.</li>
            <li>Siempre consulta a un médico o profesional de salud calificado para decisiones sobre tu salud.</li>
            <li>En caso de emergencia médica, contacta a los servicios de emergencia locales inmediatamente.</li>
            <li>Nove no se hace responsable de decisiones de salud basadas únicamente en las recomendaciones de la plataforma.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Tu cuenta</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Eres responsable de mantener la seguridad de tu cuenta.</li>
            <li>Debes proporcionar información veraz y actualizada.</li>
            <li>Tu cuenta es personal e intransferible.</li>
            <li>Debes tener al menos 18 años para usar el servicio.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Uso aceptable</h2>
          <p>Te comprometes a no:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Usar el servicio para fines ilegales.</li>
            <li>Compartir tu cuenta con terceros.</li>
            <li>Intentar acceder a datos de otros usuarios.</li>
            <li>Interferir con el funcionamiento de la plataforma.</li>
            <li>Usar la plataforma para generar diagnósticos médicos para terceros.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Laboratorios partners</h2>
          <p>
            Nove coordina con laboratorios certificados en LATAM para facilitar tus análisis.
            Los laboratorios son entidades independientes responsables de la toma de muestras, análisis y exactitud de los resultados.
            Nove no es responsable de errores en los resultados de laboratorio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Propiedad intelectual</h2>
          <p>
            Todo el contenido, software, diseño y marcas de Nove son propiedad de Nove Health.
            No puedes copiar, modificar ni distribuir nuestro contenido sin autorización.
            Tus datos de salud son tuyos — Nove solo tiene una licencia para procesarlos según estos términos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Limitación de responsabilidad</h2>
          <p>
            Nove se proporciona &quot;tal cual&quot;. En la medida permitida por la ley:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>No garantizamos que el servicio sea ininterrumpido o libre de errores.</li>
            <li>No somos responsables por daños indirectos derivados del uso del servicio.</li>
            <li>Nuestra responsabilidad máxima se limita al monto pagado por tu suscripción en los últimos 12 meses.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Terminación</h2>
          <p>
            Puedes cancelar tu cuenta en cualquier momento. Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos.
            Al cancelar, puedes solicitar la exportación y eliminación de tus datos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Cambios a estos términos</h2>
          <p>
            Podemos modificar estos términos. Te notificaremos de cambios significativos con al menos 30 días de anticipación.
            El uso continuado del servicio después de los cambios constituye aceptación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">12. Ley aplicable</h2>
          <p>
            Estos términos se rigen por las leyes de la República de Guatemala.
            Cualquier disputa se resolverá en los tribunales competentes de la Ciudad de Guatemala.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">13. Contacto</h2>
          <p>
            Para preguntas sobre estos términos, contáctanos en <strong>legal@nove.health</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
