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
  await expect(page.getByText("Registro de casos")).toBeVisible();

  await page.getByRole("button", { name: "Confirmar" }).click();
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
