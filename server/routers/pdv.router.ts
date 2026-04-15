// ============================================================
// PDV Router — Ponto de Venda JNC Comércio e Serviços
// Auth: adminLocalProcedure (cookie admin_token)
// DB:   TiDB Cloud (via pdvDb.ts + pdvConnection.ts)
// ============================================================
import { router, adminLocalProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../pdvDb";
import { generateEAN13, generateBarcodeImage } from "../pdvBarcodeService";
import { storagePut } from "../storage";

export const pdvRouter = router({

  // ── CATEGORIAS ───────────────────────────────────────────
  categories: router({
    list: adminLocalProcedure.query(async () => {
      return await db.getAllCategories();
    }),

    create: adminLocalProcedure
      .input(z.object({ name: z.string().min(1).max(100), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        return await db.createCategory(input);
      }),

    update: adminLocalProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(100).optional(), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateCategory(id, data);
      }),

    delete: adminLocalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCategory(input.id);
      }),
  }),

  // ── PRODUTOS ─────────────────────────────────────────────
  products: router({
    list: adminLocalProcedure.query(async () => {
      return await db.getAllProducts();
    }),

    getById: adminLocalProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductById(input.id);
      }),

    getByBarcode: adminLocalProcedure
      .input(z.object({ barcode: z.string().length(13) }))
      .query(async ({ input }) => {
        return await db.getProductByBarcode(input.barcode);
      }),

    search: adminLocalProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchProducts(input.query);
      }),

    lowStock: adminLocalProcedure.query(async () => {
      return await db.getLowStockProducts();
    }),

    create: adminLocalProcedure
      .input(z.object({
        barcode: z.string().optional(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/),
        costPrice: z.string().optional(),
        stock: z.number().int().min(0).default(0),
        minStock: z.number().int().min(0).default(5),
        unit: z.string().max(10).default("un"),
        categoryId: z.number().optional(),
        imageUrl: z.string().url().optional(),
        imageData: z.string().max(5_000_000).optional(), // ~3.75 MB em base64
        imageMimeType: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]).optional(),
      }))
      .mutation(async ({ input }) => {
        let barcode = input.barcode?.trim();
        if (!barcode) barcode = generateEAN13();

        const MIME_TO_EXT: Record<string, string> = {
          "image/jpeg": "jpg", "image/jpg": "jpg",
          "image/png": "png", "image/webp": "webp",
        };

        let imageUrl = input.imageUrl;
        let imageKey: string | undefined;

        if (input.imageData && input.imageMimeType) {
          const buffer = Buffer.from(input.imageData, "base64");
          const ext = MIME_TO_EXT[input.imageMimeType] ?? "jpg";
          const key = `pdv/products/${barcode}-${Date.now()}.${ext}`;
          const result = await storagePut(key, buffer, input.imageMimeType);
          imageUrl = result.url;
          imageKey = result.key;
        }

        const { imageData, imageMimeType, imageUrl: _iu, ...productData } = input;
        return await db.createProduct({ ...productData, barcode, imageUrl, imageKey });
      }),

    update: adminLocalProcedure
      .input(z.object({
        id: z.number(),
        barcode: z.string().optional(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        costPrice: z.string().optional(),
        stock: z.number().int().min(0).optional(),
        minStock: z.number().int().min(0).optional(),
        unit: z.string().max(10).optional(),
        categoryId: z.number().optional(),
        imageUrl: z.string().url().optional(),
        imageData: z.string().max(5_000_000).optional(), // ~3.75 MB em base64
        imageMimeType: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const MIME_TO_EXT: Record<string, string> = {
          "image/jpeg": "jpg", "image/jpg": "jpg",
          "image/png": "png", "image/webp": "webp",
        };
        const { id, imageData, imageMimeType, imageUrl: inputImageUrl, ...data } = input;
        let imageUrl: string | undefined = inputImageUrl;
        let imageKey: string | undefined;

        if (imageData && imageMimeType) {
          const buffer = Buffer.from(imageData, "base64");
          const ext = MIME_TO_EXT[imageMimeType] ?? "jpg";
          const key = `pdv/products/${input.barcode || id}-${Date.now()}.${ext}`;
          const result = await storagePut(key, buffer, imageMimeType);
          imageUrl = result.url;
          imageKey = result.key;
        }

        return await db.updateProduct(id, { ...data, ...(imageUrl !== undefined && { imageUrl }), ...(imageKey && { imageKey }) });
      }),

    delete: adminLocalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteProduct(input.id);
      }),

    toggleActive: adminLocalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const product = await db.getProductById(input.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
        return await db.toggleProductActive(input.id, !(product as any).active);
      }),

    importBatch: adminLocalProcedure
      .input(z.object({
        products: z.array(z.object({
          barcode: z.string().optional(),
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          price: z.string().regex(/^\d+(\.\d{1,2})?$/),
          costPrice: z.string().optional(),
          stock: z.number().int().min(0).default(0),
          minStock: z.number().int().min(0).default(5),
          unit: z.string().max(10).default("un"),
          categoryId: z.number().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        let imported = 0;
        const errors: string[] = [];
        for (const product of input.products) {
          try {
            let barcode = product.barcode?.trim();
            if (!barcode || barcode.length !== 13 || !/^\d{13}$/.test(barcode)) {
              barcode = generateEAN13();
            }
            await db.createProduct({ ...product, barcode });
            imported++;
          } catch (error) {
            errors.push(`${product.name}: ${String(error)}`);
          }
        }
        return { imported, errors };
      }),
  }),

  // ── VENDAS ───────────────────────────────────────────────
  sales: router({
    list: adminLocalProcedure.query(async () => {
      return await db.getAllSales();
    }),

    getById: adminLocalProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const sale = await db.getSaleById(input.id);
        if (!sale) throw new TRPCError({ code: "NOT_FOUND", message: "Venda não encontrada" });
        const items = await db.getSaleItemsBySaleId(input.id);
        return { ...sale, items };
      }),

    getWithFilters: adminLocalProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        paymentMethod: z.enum(["dinheiro", "cartao_debito", "cartao_credito", "pix", "all"]).optional(),
        searchId: z.string().optional(),
      }))
      .query(async ({ input }) => {
        let filtered = await db.getAllSales();

        if (input.startDate) {
          const start = new Date(input.startDate);
          start.setHours(0, 0, 0, 0);
          filtered = filtered.filter(s => new Date(s.createdAt) >= start);
        }
        if (input.endDate) {
          const end = new Date(input.endDate);
          end.setHours(23, 59, 59, 999);
          filtered = filtered.filter(s => new Date(s.createdAt) <= end);
        }
        if (input.paymentMethod && input.paymentMethod !== "all") {
          filtered = filtered.filter(s => s.paymentMethod === input.paymentMethod);
        }
        if (input.searchId) {
          const n = parseInt(input.searchId);
          if (!isNaN(n)) filtered = filtered.filter(s => s.id === n);
        }

        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return filtered;
      }),

    create: adminLocalProcedure
      .input(z.object({
        items: z.array(z.object({
          productId: z.number(),
          productName: z.string(),
          quantity: z.number().int().min(1),
          unitPrice: z.string(),
        })),
        discount: z.number().min(0).default(0),
        discountType: z.enum(["percentage", "fixed"]).default("fixed"),
        paymentMethod: z.enum(["dinheiro", "cartao_debito", "cartao_credito", "pix"]).default("dinheiro"),
        amountPaid: z.number().min(0).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        let subtotal = 0;
        for (const item of input.items) {
          subtotal += parseFloat(item.unitPrice) * item.quantity;
        }

        const discountAmount = input.discountType === "percentage"
          ? (subtotal * input.discount) / 100
          : input.discount;

        const total = subtotal - discountAmount;
        const change = input.amountPaid && input.amountPaid > 0 ? input.amountPaid - total : 0;

        const saleResult = await db.createSale({
          total: total.toFixed(2),
          discount: input.discount.toFixed(2),
          discountType: input.discountType,
          paymentMethod: input.paymentMethod,
          amountPaid: input.amountPaid ? input.amountPaid.toFixed(2) : null,
          change: change > 0 ? change.toFixed(2) : null,
          userId: ctx.adminId,
        });

        const saleId = Number(saleResult.insertId);

        for (const item of input.items) {
          const itemSubtotal = parseFloat(item.unitPrice) * item.quantity;
          await db.createSaleItem({
            saleId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: itemSubtotal.toFixed(2),
          });

          const product = await db.getProductById(item.productId);
          if (product) {
            await db.updateProduct(item.productId, { stock: product.stock - item.quantity });
          }
        }

        await db.createCashTransaction({
          type: "entrada",
          amount: total.toFixed(2),
          description: `Venda #${saleId}`,
          saleId,
          userId: ctx.adminId,
        });

        return { saleId, total };
      }),

    cancel: adminLocalProcedure
      .input(z.object({ saleId: z.number(), reason: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const sale = await db.getSaleById(input.saleId);
        if (!sale) throw new TRPCError({ code: "NOT_FOUND", message: "Venda não encontrada" });
        if ((sale as any).canceled) throw new TRPCError({ code: "BAD_REQUEST", message: "Venda já está cancelada" });

        const items = await db.getSaleItemsBySaleId(input.saleId);
        for (const item of items) {
          const product = await db.getProductById(item.productId);
          if (product) {
            await db.updateProduct(item.productId, { stock: product.stock + item.quantity });
          }
        }

        await db.createCashTransaction({
          type: "saida",
          amount: sale.total,
          description: `Cancelamento da Venda #${input.saleId} - ${input.reason}`,
          saleId: input.saleId,
          userId: ctx.adminId,
        });

        await db.cancelSale(input.saleId, input.reason);
        return { success: true };
      }),
  }),

  // ── FLUXO DE CAIXA ───────────────────────────────────────
  cash: router({
    list: adminLocalProcedure.query(async () => {
      return await db.getAllCashTransactions();
    }),

    getBalance: adminLocalProcedure.query(async () => {
      return await db.getCashBalance();
    }),

    createTransaction: adminLocalProcedure
      .input(z.object({
        type: z.enum(["entrada", "saida"]),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        description: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createCashTransaction({ ...input, userId: ctx.adminId });
      }),
  }),

  // ── CLIENTES PDV ─────────────────────────────────────────
  customers: router({
    list: adminLocalProcedure.query(async () => {
      return await db.getAllCustomers();
    }),

    search: adminLocalProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchCustomers(input.query);
      }),

    create: adminLocalProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        cpfCnpj: z.string().max(18).optional(),
        phone: z.string().max(20).optional(),
        email: z.string().email().max(320).optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createCustomer(input);
      }),

    update: adminLocalProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        cpfCnpj: z.string().max(18).optional(),
        phone: z.string().max(20).optional(),
        email: z.string().email().max(320).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateCustomer(id, data);
      }),

    delete: adminLocalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCustomer(input.id);
      }),
  }),

  // ── DASHBOARD ────────────────────────────────────────────
  dashboard: router({
    stats: adminLocalProcedure.query(async () => {
      return await db.getDashboardStats();
    }),
  }),

  // ── BACKUP ───────────────────────────────────────────────
  backup: router({
    generate: adminLocalProcedure.mutation(async () => {
      const backupData = await db.generateFullBackup();
      const jsonContent = JSON.stringify(backupData, null, 2);
      const filename = `backup-pdv-${new Date().toISOString().split("T")[0]}-${Date.now()}.json`;
      return {
        filename,
        data: jsonContent,
        size: Buffer.byteLength(jsonContent, "utf-8"),
        timestamp: backupData.timestamp,
        metadata: backupData.metadata,
      };
    }),
  }),

  // ── CÓDIGO DE BARRAS ─────────────────────────────────────
  barcode: router({
    generate: adminLocalProcedure.mutation(() => {
      return { barcode: generateEAN13() };
    }),

    getImage: adminLocalProcedure
      .input(z.object({ barcode: z.string().min(1).max(30) }))
      .query(async ({ input }) => {
        const imageBuffer = await generateBarcodeImage(input.barcode);
        return { imageBase64: imageBuffer.toString("base64") };
      }),
  }),
});

export type PdvRouter = typeof pdvRouter;
