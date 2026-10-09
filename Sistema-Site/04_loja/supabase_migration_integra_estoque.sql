-- =========================================================================
-- MIGRATION: INTEGRAR ESTOQUE DA LOJA COM O SALÃO
-- =========================================================================

-- 1. Adiciona a coluna salon_inventory_id na tabela products da Loja
ALTER TABLE products 
ADD COLUMN salon_inventory_id UUID REFERENCES salon_inventory(id) ON DELETE SET NULL;

COMMENT ON COLUMN products.salon_inventory_id IS 'Vincula o produto da loja a um item do estoque do salão (salon_inventory) para baixa automática';

-- 2. Função (Trigger) para baixar o estoque do salão quando for feita venda na loja
CREATE OR REPLACE FUNCTION sync_store_order_to_salon_inventory()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    v_salon_id UUID;
BEGIN
    -- Quando o pedido muda para 'PAID' ou 'DELIVERED', nós processamos a baixa
    -- Nota: dependendo da sua regra, pode ser no INSERT da order_items ou no UPDATE do status.
    -- Vamos fazer quando o pedido for dado como PAGO (status = 'PAID') e antes era diferente.
    IF NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
        
        -- Percorre todos os itens desse pedido
        FOR item IN SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id LOOP
            
            -- Verifica se o produto tem vínculo com o salão
            SELECT salon_inventory_id INTO v_salon_id FROM products WHERE id = item.product_id;
            
            IF v_salon_id IS NOT NULL THEN
                -- 1. Registra a movimentação em salon_inventory_movements
                INSERT INTO salon_inventory_movements (inventory_id, type, qty, notes, created_by)
                VALUES (v_salon_id, 'OUT_SALE', item.quantity, 'Venda Loja Virtual - Pedido: ' || NEW.id, 'SISTEMA LOJA');
                
                -- 2. Atualiza o saldo em salon_inventory
                UPDATE salon_inventory 
                SET stock_qty = stock_qty - item.quantity, updated_at = now()
                WHERE id = v_salon_id;
            END IF;
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Cria o Trigger na tabela orders
DROP TRIGGER IF EXISTS trigger_sync_store_order ON orders;
CREATE TRIGGER trigger_sync_store_order
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE PROCEDURE sync_store_order_to_salon_inventory();
