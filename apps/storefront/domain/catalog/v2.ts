import type {CatalogV2Product} from '../../lib/catalog-v2-client';
import type {Product} from '../../services/contracts/catalog';
/** No invented seller/brand/rating/assets. Unequal prices require an explicit variant. */
export function mapCatalogV2(p:CatalogV2Product):Product{
 const variants=p.variants.filter(v=>v.purchasable);
 return {id:p.id,sellerId:p.sellerId,handle:p.handle,title:p.title,description:p.description,category:p.categoryId,subcategory:'',vendor:p.attributes.brand??'',rating:0,reviewCount:0,reviews:[],visual:'home',availabilityModel:'binary',available:p.available,publishedAt:p.publishedAt,requiresVariantSelection:p.price===null,price:p.price??{amountMinor:0,currency:'UAH'},sku:variants[0]?.sku??'',purchaseEnabled:false,
 variants:variants.map(v=>({...v,mediaIndex:Math.max(0,p.media.findIndex(m=>m.variantId===v.id))})),media:p.media,
 gallery:p.media.map(m=>({id:m.id,label:m.alt,tone:'transparent',src:m.src,width:m.width,height:m.height})),specifications:Object.entries(p.attributes).map(([label,value])=>({label,value}))};
}
