import { expect, test } from "@playwright/test";

/**
 * Flujo feliz completo contra el modo demo (LLM_SIMULADO=1, sin red ni key):
 * plantear necesidad → delimitar → propuesta en el panel → confirmar.
 */
test("del problema al requerimiento confirmado", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const composer = page.getByLabel("Mensaje");
  await composer.fill("Se nos están atrasando los pedidos y no sabemos por qué");
  await composer.press("Enter");
  await expect(page.getByText("¿Desde cuándo lo notan")).toBeVisible();
  await expect(page.getByText("Sin requerimiento")).toBeVisible();

  await composer.fill("Desde hace unos meses, creemos que es por los cambios de responsable");
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByText("Esperando confirmación")).toBeVisible();
  await expect(page.getByText("Registro de casos", { exact: true })).toBeVisible();

  // Confirmar pide una confirmación con el resumen; "Volver" no cierra nada.
  await page.getByRole("button", { name: "Confirmar" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("¿Confirmar la versión 1?")).toBeVisible();
  await expect(dialogo.getByText("archivo", { exact: true })).toBeVisible();
  await dialogo.getByRole("button", { name: "Volver" }).click();
  await expect(page.getByText("Esperando confirmación")).toBeVisible();

  await page.getByRole("button", { name: "Confirmar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Sí, confirmar" }).click();
  await expect(page.getByText("Requerimiento confirmado.")).toBeVisible();
  await expect(composer).toBeDisabled();
});

test("si la API falla, el mensaje del usuario no se pierde", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.route("/api/chat", (ruta) =>
    ruta.fulfill({
      status: 504,
      contentType: "application/json",
      body: JSON.stringify({ codigo: "llm_timeout", error: "El modelo tardó demasiado en responder." }),
    }),
  );

  const composer = page.getByLabel("Mensaje");
  await composer.fill("Tenemos inconsistencias en el inventario");
  await composer.press("Enter");

  await expect(page.getByRole("alert").filter({ hasText: "No se envió" })).toBeVisible();
  await expect(composer).toHaveValue("Tenemos inconsistencias en el inventario");

  // Al reintentar con la API sana, el flujo sigue.
  await page.unroute("/api/chat");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("¿Desde cuándo lo notan")).toBeVisible();
});

test("en el celular, chat y requerimiento van en pestañas y avisa cuando hay versión nueva", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const pestanaPanel = page.getByRole("tab", { name: /Requerimiento/ });
  const composer = page.getByLabel("Mensaje");
  await expect(composer).toBeVisible();
  await expect(page.getByRole("region", { name: "Requerimiento de datos" })).toBeHidden();

  await composer.fill("Se nos están atrasando los pedidos");
  await composer.press("Enter");
  await expect(page.getByText("¿Desde cuándo lo notan")).toBeVisible();
  await composer.fill("Desde hace unos meses, por los cambios de responsable");
  await composer.press("Enter");

  await expect(pestanaPanel).toContainText("v1");
  await expect(pestanaPanel).toContainText("nueva");

  await pestanaPanel.click();
  await expect(page.getByRole("region", { name: "Requerimiento de datos" })).toBeVisible();
  await expect(composer).toBeHidden();
  await expect(pestanaPanel).not.toContainText("nueva");

  // "Ajustar" vuelve al chat con el cuadro listo para escribir.
  await page.getByRole("button", { name: "Ajustar" }).click();
  await expect(composer).toBeVisible();
  await expect(composer).toHaveValue("Quiero ajustar: ");
});
