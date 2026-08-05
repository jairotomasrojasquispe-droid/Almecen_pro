
export class ProductEntity {
  constructor({id, sku, nombre, categoria, stock, stock_minimo, costo, ubicacion, proveedor, imagen_url}){
    this.id=id; this.sku=sku; this.nombre=nombre; this.categoria=categoria;
    this.stock=stock; this.stockMinimo=stock_minimo; this.costo=costo;
    this.ubicacion=ubicacion; this.proveedor=proveedor; this.imagen=imagen_url;
  }
  isLow(){ return this.stock <= this.stockMinimo }
  faltante(){ return Math.max(0, this.stockMinimo - this.stock + this.stockMinimo) }
}
