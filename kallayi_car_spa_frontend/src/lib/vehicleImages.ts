/**
 * KALLAYI CAR SPA & AUTO CARE - VEHICLE IMAGE RESOLVER
 * Curated high-definition vehicle photography from permanent automotive CDNs
 * with strict referer bypass and graceful multi-tier fallback.
 */

import { VehicleType } from "@/types/database";

// High-definition fallback photography per Vehicle Body Type
export const VEHICLE_TYPE_FALLBACK_IMAGES: Record<string, string> = {
  HATCHBACK: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80",
  SEDAN: "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=600&q=80",
  COMPACT_SUV: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80",
  SUV: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80",
  MUV: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80",
  LUXURY: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80",
  VAN: "https://images.unsplash.com/photo-1527786356703-4b100091cd2c?auto=format&fit=crop&w=600&q=80",
  BIKE: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80",
  AUTO: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=600&q=80",
  TRUCK: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80",
  CAR: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80",
  ALL: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80",
};

// Exact model mappings for direct, pixel-perfect matches
export const EXACT_MODEL_IMAGES: Record<string, string> = {
  // --- BMW VERIFIED LINEUP ---
  "bmw_3series": "https://images.91wheels.com/assets/c_images/gallery/bmw/3-series-gran-limousine/bmw-3-series-gran-limousine-7-1778487062.png",
  "bmw_3seriesgranlimousine": "https://images.91wheels.com/assets/c_images/gallery/bmw/3-series-gran-limousine/bmw-3-series-gran-limousine-7-1778487062.png",
  "bmw_granlimousine": "https://images.91wheels.com/assets/c_images/gallery/bmw/3-series-gran-limousine/bmw-3-series-gran-limousine-7-1778487062.png",
  "bmw_330li": "https://images.91wheels.com/assets/c_images/gallery/bmw/3-series-gran-limousine/bmw-3-series-gran-limousine-7-1778487062.png",
  "bmw_320ld": "https://images.91wheels.com/assets/c_images/gallery/bmw/3-series-gran-limousine/bmw-3-series-gran-limousine-7-1778487062.png",
  "bmw_m340i": "https://stimg.cardekho.com/images/carexteriorimages/630x420/BMW/3-Series/10574/1761732994122/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  "bmw_5series": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/175183/5-series-exterior-right-front-three-quarter-95.png?isig=0&q=80&q=80",
  "bmw_530li": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/175183/5-series-exterior-right-front-three-quarter-95.png?isig=0&q=80&q=80",
  "bmw_520d": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/175183/5-series-exterior-right-front-three-quarter-95.png?isig=0&q=80&q=80",
  "bmw_7series": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTM_8i6A1FThwj7Efa6D41K6l8U36kyDK93bNEB0wWVpSN432aZqsRLtKU&s=10",
  "bmw_740li": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTM_8i6A1FThwj7Efa6D41K6l8U36kyDK93bNEB0wWVpSN432aZqsRLtKU&s=10",
  "bmw_740d": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTM_8i6A1FThwj7Efa6D41K6l8U36kyDK93bNEB0wWVpSN432aZqsRLtKU&s=10",
  "bmw_i7": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTM_8i6A1FThwj7Efa6D41K6l8U36kyDK93bNEB0wWVpSN432aZqsRLtKU&s=10",
  "bmw_x1": "https://bmw.scene7.com/is/image/BMW/X1_diesel:2to1?fmt=webp&wid=2560&fit=wrap%2C+1",
  "bmw_ix1": "https://bmw.scene7.com/is/image/BMW/X1_diesel:2to1?fmt=webp&wid=2560&fit=wrap%2C+1",
  "bmw_x3": "https://imgd.aeplcdn.com/664x374/n/cw/ec/179903/x3-exterior-right-side-view.png?isig=0&q=80&q=80",
  "bmw_ix3": "https://imgd.aeplcdn.com/664x374/n/cw/ec/179903/x3-exterior-right-side-view.png?isig=0&q=80&q=80",
  "bmw_x5": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqOpEaUnSvg0nhvcsRT0RBQjs-VwGjVMFZjyMGNHcIvA&s=10",
  "bmw_x7": "https://imgd.aeplcdn.com/664x374/n/cw/ec/136217/x7-exterior-right-front-three-quarter-10.png?isig=0&q=80",
  "bmw_m3": "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80",
  "bmw_m4": "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80",
  "bmw_m5": "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80",
  "bmw_z4": "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80",

  // --- MERCEDES-BENZ VERIFIED LINEUP ---
  "mercedesbenz_cclass": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Mercedes-Benz/C-Class/10858/1774342866770/front-left-side-47.jpg",
  "mercedes_cclass": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Mercedes-Benz/C-Class/10858/1774342866770/front-left-side-47.jpg",
  "mercedesbenz_sclass": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Mercedes-Benz/S-Class/13591/1781510460490/front-left-side-47.jpg",
  "mercedes_sclass": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Mercedes-Benz/S-Class/13591/1781510460490/front-left-side-47.jpg",
  "mercedesbenz_gla": "https://imgd.aeplcdn.com/664x374/n/kmq0lcb_1713621.jpg?q=80",
  "mercedes_gla": "https://imgd.aeplcdn.com/664x374/n/kmq0lcb_1713621.jpg?q=80",
  "mercedesbenz_glc": "https://www.mercedes-benz.com.sg/content/dam/hq/passengercars/cars/glc/glc-suv-x254-fl-pi/overview/spa-highlights/02-2025/images/mercedes-benz-glc-suv-x254-spa-highlights-exterior-2400x2400-02-2025.jpg?im=Resize,width=1184",
  "mercedes_glc": "https://www.mercedes-benz.com.sg/content/dam/hq/passengercars/cars/glc/glc-suv-x254-fl-pi/overview/spa-highlights/02-2025/images/mercedes-benz-glc-suv-x254-spa-highlights-exterior-2400x2400-02-2025.jpg?im=Resize,width=1184",
  "mercedesbenz_gle": "https://assets.v3cars.com/media/model-imgs/1698995084-mercedes-benz-gle.webp",
  "mercedes_gle": "https://assets.v3cars.com/media/model-imgs/1698995084-mercedes-benz-gle.webp",
  "mercedesbenz_gls": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Mercedes-Benz/GLS/9791/1763535546980/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  "mercedes_gls": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Mercedes-Benz/GLS/9791/1763535546980/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  "mercedesbenz_gwagon": "https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fcar-images%2Forig%2Fmercedes-amg%2Fg-63%2Fmercedes-amg-g-63.jpg%3Fv%3D41&w=1920&q=75",
  "mercedes_gwagon": "https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fcar-images%2Forig%2Fmercedes-amg%2Fg-63%2Fmercedes-amg-g-63.jpg%3Fv%3D41&w=1920&q=75",
  "mercedesbenz_g63": "https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fcar-images%2Forig%2Fmercedes-amg%2Fg-63%2Fmercedes-amg-g-63.jpg%3Fv%3D41&w=1920&q=75",
  "mercedes_g63": "https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fcar-images%2Forig%2Fmercedes-amg%2Fg-63%2Fmercedes-amg-g-63.jpg%3Fv%3D41&w=1920&q=75",
  "mercedesbenz_gclass": "https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fcar-images%2Forig%2Fmercedes-amg%2Fg-63%2Fmercedes-amg-g-63.jpg%3Fv%3D41&w=1920&q=75",
  "mercedes_gclass": "https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fcar-images%2Forig%2Fmercedes-amg%2Fg-63%2Fmercedes-amg-g-63.jpg%3Fv%3D41&w=1920&q=75",

  // --- AUDI VERIFIED LINEUP ---
  "audi_a4": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuqD2Za5OBxnvlqTUfVrIi5CGQHl1f2CROZA5OG91MRMQdinUJGO_FDTVa&s=10",
  "audi_a6": "https://images.hgmsites.net/lrg/2025-audi-a6-performance-4-0-tfsi-quattro-angular-front-exterior-view_100965885_l.webp",
  "audi_a8l": "https://www.motorbeam.com/wp-content/uploads/2015-Audi-A8L-Security-Showcase.jpg",
  "audi_a8": "https://www.motorbeam.com/wp-content/uploads/2015-Audi-A8L-Security-Showcase.jpg",
  "audi_q3": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Audi/Q3-Sportback/10568/1757140731610/front-left-side-47.jpg",
  "audi_q3sportback": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Audi/Q3-Sportback/10568/1757140731610/front-left-side-47.jpg",
  "audi_q5": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/53591/q5-exterior-right-front-three-quarter-37.png?isig=0&q=80&q=80",
  "audi_q7": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCBVhQA-jE8_lbchc5wV4RoG2KBzjSiud6xVpMh3nJsbxGQ9EDXBvgztw&s=10",
  "audi_q8": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Audi/RS-Q8/12377/1757402656751/front-left-side-47.jpg",
  "audi_rsq8": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Audi/RS-Q8/12377/1757402656751/front-left-side-47.jpg",

  // --- LAND ROVER VERIFIED LINEUP ---
  "landrover_rangerover": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Land-Rover/Land-Rover-Range-Rover-2009-2010/4020/1561450249119/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  "landrover_rangerowersport": "https://static-cdn.team-bhp.com/prod/new-car-cms/Land-Rover/Range-Rover-Sport/2024/04/01/ab053d81-a777-47ce-ae93-6a38a5382c11-Land-Rover_Range-Rover-Sport_Fuji-White.png?w=688&dpr=3&optimize=low&format=auto&quality=50",
  "landrover_rangersport": "https://static-cdn.team-bhp.com/prod/new-car-cms/Land-Rover/Range-Rover-Sport/2024/04/01/ab053d81-a777-47ce-ae93-6a38a5382c11-Land-Rover_Range-Rover-Sport_Fuji-White.png?w=688&dpr=3&optimize=low&format=auto&quality=50",
  "landrover_sport": "https://static-cdn.team-bhp.com/prod/new-car-cms/Land-Rover/Range-Rover-Sport/2024/04/01/ab053d81-a777-47ce-ae93-6a38a5382c11-Land-Rover_Range-Rover-Sport_Fuji-White.png?w=688&dpr=3&optimize=low&format=auto&quality=50",
  "landrover_velar": "https://media.cdn-jaguarlandrover.com/api/v2/images/120085/w/640/h/360.jpg",
  "landrover_rangerovervelar": "https://media.cdn-jaguarlandrover.com/api/v2/images/120085/w/640/h/360.jpg",
  "landrover_evoque": "https://images.91wheels.com/assets/c_images/gallery/landrover/range-rover-evoque/landrover-range-rover-evoque-2-1767932428.png",
  "landrover_rangeroverevoque": "https://images.91wheels.com/assets/c_images/gallery/landrover/range-rover-evoque/landrover-range-rover-evoque-2-1767932428.png",
  "landrover_defender": "https://images.91wheels.com/assets/c_images/gallery/landrover/defender/landrover-defender-0-1773131194.png",
  "landrover_discovery": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Land-Rover/Discovery/8520/1767783067458/front-left-side-47.jpg?imwidth=420&impolicy=resize",

  // Range Rover sub-brand aliases
  "rangerover_rangerover": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Land-Rover/Land-Rover-Range-Rover-2009-2010/4020/1561450249119/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  "rangerover_sport": "https://static-cdn.team-bhp.com/prod/new-car-cms/Land-Rover/Range-Rover-Sport/2024/04/01/ab053d81-a777-47ce-ae93-6a38a5382c11-Land-Rover_Range-Rover-Sport_Fuji-White.png?w=688&dpr=3&optimize=low&format=auto&quality=50",
  "rangerover_velar": "https://media.cdn-jaguarlandrover.com/api/v2/images/120085/w/640/h/360.jpg",
  "rangerover_evoque": "https://images.91wheels.com/assets/c_images/gallery/landrover/range-rover-evoque/landrover-range-rover-evoque-2-1767932428.png",
  "rangerover_vogue": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Land-Rover/Land-Rover-Range-Rover-2009-2010/4020/1561450249119/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  "rangerover_autobiography": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Land-Rover/Land-Rover-Range-Rover-2009-2010/4020/1561450249119/front-left-side-47.jpg?imwidth=420&impolicy=resize",

  // --- PORSCHE VERIFIED LINEUP ---
  "porsche_cayenne": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnPA2oCD70yYytleDBjcrat0LmO7Cxctzq86235UKqeVofIxVnOgDm1mrX&s=10",
  "porsche_macan": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0drOFcvuY_GiQfs7tf8H1KeZ94qWsJWHL7j36gpbmtCdGajISajZZK3eY&s=10",
  "porsche_panamera": "https://images.financialexpressdigital.com/2024/07/Porsche-Panamera-GTS.jpg",
  "porsche_911": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Porsche/911/11757/1762933836560/front-left-side-47.jpg?imwidth=420&impolicy=resize",

  // --- VOLVO VERIFIED LINEUP ---
  "volvo_xc40": "https://media.zigcdn.com/media/model/2026/Jul/front-left-quarter-view-157681838_930x620.jpg",
  "volvo_xc40recharge": "https://media.zigcdn.com/media/model/2026/Jul/front-left-quarter-view-157681838_930x620.jpg",
  "volvo_ex40": "https://media.zigcdn.com/media/model/2026/Jul/front-left-quarter-view-157681838_930x620.jpg",
  "volvo_c40": "https://media.zigcdn.com/media/model/2026/Jul/front-left-quarter-view-157681838_930x620.jpg",
  "volvo_xc60": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIWyoybqF2EjJVB8pJgtmfY9J93z6hBhTZtgW4POc9GqENlBSExanZ8xQ&s=10",
  "volvo_xc90": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrLjAZoW3yhLCkp4n1d82rLpftQcKi0UQHGjym0VzwHSCtF5vPyD65VyyU&s=10",
  "volvo_s90": "https://imgd.aeplcdn.com/664x374/n/cw/ec/131145/s90-exterior-right-front-three-quarter-4.jpeg?isig=0&q=80&q=80",

  // --- JAGUAR VERIFIED LINEUP ---
  "jaguar_fpace": "https://imgd.aeplcdn.com/664x374/n/cw/ec/56265/f-pace-exterior-right-front-three-quarter-5.png?isig=0&q=80",
  "jaguar_xf": "https://www.v3cars.com/cdn-cgi/image/width=1920%2Cquality=75%2Cformat=auto/https://assets.v3cars.com/media/model-imgs/1625554503-Jaguar-XF.jpg",
  "jaguar_xe": "https://www.v3cars.com/cdn-cgi/image/width=1920%2Cquality=75%2Cformat=auto/https://assets.v3cars.com/media/model-imgs/1625554503-Jaguar-XF.jpg",
  "jaguar_xj": "https://www.v3cars.com/cdn-cgi/image/width=1920%2Cquality=75%2Cformat=auto/https://assets.v3cars.com/media/model-imgs/1625554503-Jaguar-XF.jpg",

  // --- MAHINDRA VERIFIED LINEUP ---
  "mahindra_thar": "https://img.gaadicdn.com/images/car-images/large/Mahindra/Thar/12264/1759493860311/GALAXY-GREY_3d414b.jpg",
  "mahindra_tharroxx": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Mahindra/Thar-ROXX/11939/1778649951124/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  "mahindra_roxx": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Mahindra/Thar-ROXX/11939/1778649951124/front-left-side-47.jpg?imwidth=420&impolicy=resize",

  "mahindra_scorpion": "https://stimg.cardekho.com/images/car-images/930x620/Mahindra/Scorpio-N/13746/1785924987591/EVEREST-WHITE_d1d3d5.jpg",
  "mahindra_scorpio": "https://stimg.cardekho.com/images/car-images/930x620/Mahindra/Scorpio-N/13746/1785924987591/EVEREST-WHITE_d1d3d5.jpg",
  "mahindra_scorpioclassic": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/128413/scorpio-exterior-right-front-three-quarter-2.png?isig=0&q=80&q=80",

  "mahindra_xuv700": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7MqW4wMcx9gWJFxoXrFjdjOfK8A_5N5EKl4-r_Uh_mw&s=10",
  "mahindra_xuv3xo": "https://imgd.aeplcdn.com/642x361/n/cw/ec/175965/mahindra-xuv-3xo-right-front-three-quarter1.jpeg?isig=0&q=75",
  "mahindra_3xo": "https://imgd.aeplcdn.com/642x361/n/cw/ec/175965/mahindra-xuv-3xo-right-front-three-quarter1.jpeg?isig=0&q=75",
  "mahindra_xuv300": "https://imgd.aeplcdn.com/642x361/n/cw/ec/175965/mahindra-xuv-3xo-right-front-three-quarter1.jpeg?isig=0&q=75",

  "mahindra_bolero": "https://d2dbmkua9abaw6.cloudfront.net/uploads/products/Mahindra-Bolero-20260716-faee7c7a-7110-4e5a-b7cc-337eaad65811.webp",
  "mahindra_boleroneo": "https://img.gaadicdn.com/images/car-images/large/Mahindra/Bolero-Neo/8506/1626171945457/225_dimaond-white_ffffff.jpg",
  "mahindra_neo": "https://img.gaadicdn.com/images/car-images/large/Mahindra/Bolero-Neo/8506/1626171945457/225_dimaond-white_ffffff.jpg",

  // --- TATA MOTORS ---
  "tata_nexon": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYJFlHeBbTq6aXNPc49LV-maZ_m9RexVNQsaZN3wGDsg&s=10",
  "tata_punch": "https://ackodrive-prod.ackoassets.com/image/tata/model4798/daytona-grey/default/Transparent.png",
  "tata_harrier": "https://img.gaadicdn.com/images/car-images/large/Tata/Harrier/12822/1773399746131/Pristine-White_eeeef0.jpg",
  "tata_safari": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Tata/Safari/12790/1785837912567/front-left-side-47.jpg",
  "tata_curvv": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv5CPd3qr2SChdyCBLH7753Wg5YUl11B77ENZguedDwaQD3UivZNi0jaM&s=10",
  "tata_altroz": "https://malikautoworld.com/wp-content/uploads/2025/05/RoyalBlue-0-4.png",
  "tata_tiago": "https://asset.carwyapar.com/Car%20Images/Tata/Tiago/Tiago%20XZ/Tata%20Tiago%20%20XZ%201.webp",
  "tata_tigor": "https://motoroctane.com/wp-content/uploads/2018/10/Tigor.jpg",

  // --- HYUNDAI ---
  "hyundai_creta": "https://ackodrive-prod.ackoassets.com/image/hyundai/creta/default/Hero-Transparent.png",
  "hyundai_venue": "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20190523032626_Hyundai-Venue-white.jpg?w=728&q=75&fm=auto",
  "hyundai_alcazar": "https://www.indiacarnews.com/wp-content/uploads/2021/06/Hyundai-Alcazar-Dual-tone-price.jpg",
  "hyundai_exter": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/216807/exter-exterior-right-front-three-quarter.png?isig=0&q=80&q=80",
  "hyundai_tucson": "https://mc.bajajfinserv.in/media/catalog/product/h/y/hyundaitucsonplatinumdieselatstarrynight_base.jpeg",
  "hyundai_i20": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Hyundai/i20/11092/1755774177956/front-left-side-47.jpg",
  "hyundai_grandi10nios": "https://stimg.cardekho.com/pwa/img/quickverdict/Grand_i10_nios-removebg-preview.png",
  "hyundai_grandi10": "https://stimg.cardekho.com/pwa/img/quickverdict/Grand_i10_nios-removebg-preview.png",
  "hyundai_i10": "https://stimg.cardekho.com/pwa/img/quickverdict/Grand_i10_nios-removebg-preview.png",
  "hyundai_verna": "https://www.hyundai.com/content/dam/hyundai/in/en/data/vehicle-thumbnail/Thumbnail/verna_thumbanil_pc.png",
  "hyundai_aura": "https://imgd.aeplcdn.com/664x374/n/cw/ec/139133/aura-exterior-right-front-three-quarter-9.png?isig=0&q=80",

  // --- MARUTI SUZUKI ---
  "marutisuzuki_swift": "https://images.91wheels.com/assets/c_images/gallery/maruti/swift/maruti-swift-7-1767861017.png?w=600&q=40",
  "maruti_swift": "https://images.91wheels.com/assets/c_images/gallery/maruti/swift/maruti-swift-7-1767861017.png?w=600&q=40",
  "marutisuzuki_baleno": "https://www.spinny.com/blog/wp-content/uploads/2025/03/Maruti-Suzuki-Baleno-Safety-Rating-NCAP-Rating-Safety-Features-jpg.webp",
  "maruti_baleno": "https://www.spinny.com/blog/wp-content/uploads/2025/03/Maruti-Suzuki-Baleno-Safety-Rating-NCAP-Rating-Safety-Features-jpg.webp",
  "marutisuzuki_dzire": "https://static.caronphone.com/public/brands/21/493/2518/2518_1731400408.webp",
  "maruti_dzire": "https://static.caronphone.com/public/brands/21/493/2518/2518_1731400408.webp",
  "marutisuzuki_swiftdzire": "https://static.caronphone.com/public/brands/21/493/2518/2518_1731400408.webp",
  "maruti_swiftdzire": "https://static.caronphone.com/public/brands/21/493/2518/2518_1731400408.webp",
  "marutisuzuki_wagonr": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtiiWv4UGsY4VCMohTEyeBnpktCxoSCf5xB1UP-e7HQw&s=10",
  "maruti_wagonr": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtiiWv4UGsY4VCMohTEyeBnpktCxoSCf5xB1UP-e7HQw&s=10",
  "marutisuzuki_altok10": "https://images.91wheels.com/assets/c_images/gallery/maruti/alto-k10/maruti-alto-k10-10-1766734886.png?w=520&q=40",
  "maruti_altok10": "https://images.91wheels.com/assets/c_images/gallery/maruti/alto-k10/maruti-alto-k10-10-1766734886.png?w=520&q=40",
  "marutisuzuki_celerio": "https://www.varunmaruti.com/uploads/products/colors/celerio-pearl-midnight-black.png",
  "maruti_celerio": "https://www.varunmaruti.com/uploads/products/colors/celerio-pearl-midnight-black.png",
  "marutisuzuki_ignis": "https://d147al5y0i1rb.cloudfront.net/uploads/leasing/offer/image/30461/suzuki-ignis-hybrid-adventure_GoMore_1678455505.png?ixlib=rails-4.3.1&auto=format%2Ccompress&w=420&h=279&fit=clip&dpr=3",
  "maruti_ignis": "https://d147al5y0i1rb.cloudfront.net/uploads/leasing/offer/image/30461/suzuki-ignis-hybrid-adventure_GoMore_1678455505.png?ixlib=rails-4.3.1&auto=format%2Ccompress&w=420&h=279&fit=clip&dpr=3",
  "marutisuzuki_ciaz": "https://images.garipoint.com/get_new_car_images.php?width=580&height=320&path=model_images/maruti/ciaz/maruti-ciaz-Pearl-Midnight-Black.jpg",
  "maruti_ciaz": "https://images.garipoint.com/get_new_car_images.php?width=580&height=320&path=model_images/maruti/ciaz/maruti-ciaz-Pearl-Midnight-Black.jpg",
  "marutisuzuki_brezza": "https://static-cdn.cars24.com/prod/auto-news24-cms/cars24-blog-images/2026/03/01/985c2789-a134-4c92-9e56-5a71dc8c322b-complete-guide-on-buying-a-maruti-suzuki-brezza-.webp",
  "maruti_brezza": "https://static-cdn.cars24.com/prod/auto-news24-cms/cars24-blog-images/2026/03/01/985c2789-a134-4c92-9e56-5a71dc8c322b-complete-guide-on-buying-a-maruti-suzuki-brezza-.webp",
  "marutisuzuki_grandvitara": "https://imgd.aeplcdn.com/600x600/n/cw/ec/134801/maruti-suzuki-grand-vitara-right-front-three-quarter0.jpeg?isig=0&wm=0",
  "maruti_grandvitara": "https://imgd.aeplcdn.com/600x600/n/cw/ec/134801/maruti-suzuki-grand-vitara-right-front-three-quarter0.jpeg?isig=0&wm=0",
  "marutisuzuki_fronx": "https://tb-static.uber.com/prod/vehicles-importer/2024/maruti-suzuki/fronx/high_res/1567890275497.png",
  "maruti_fronx": "https://tb-static.uber.com/prod/vehicles-importer/2024/maruti-suzuki/fronx/high_res/1567890275497.png",
  "marutisuzuki_jimny": "https://ackodrive-prod.ackoassets.com/image/maruti-suzuki/jimny/default/Hero-Transparent.png",
  "maruti_jimny": "https://ackodrive-prod.ackoassets.com/image/maruti-suzuki/jimny/default/Hero-Transparent.png",
  "marutisuzuki_ertiga": "https://imgd.aeplcdn.com/370x208/cw/ec/34140/Maruti-Suzuki-Ertiga-Exterior-125954.jpg?wm=1&q=80",
  "maruti_ertiga": "https://imgd.aeplcdn.com/370x208/cw/ec/34140/Maruti-Suzuki-Ertiga-Exterior-125954.jpg?wm=1&q=80",
  "marutisuzuki_xl6": "https://imgd.aeplcdn.com/1200x900/n/cw/ec/120705/maruti-suzuki-xl6-right-front-three-quarter0.jpeg?isig=0&wm=0",
  "maruti_xl6": "https://imgd.aeplcdn.com/1200x900/n/cw/ec/120705/maruti-suzuki-xl6-right-front-three-quarter0.jpeg?isig=0&wm=0",
  "marutisuzuki_eeco": "https://stimg.cardekho.com/images/car-images/large/Maruti/Eeco/9455/Maruti-Eeco-7-Seater-STD/1669179092994/225_glistening-grey_57575a.jpg?impolicy=resize&imwidth=420",
  "maruti_eeco": "https://stimg.cardekho.com/images/car-images/large/Maruti/Eeco/9455/Maruti-Eeco-7-Seater-STD/1669179092994/225_glistening-grey_57575a.jpg?impolicy=resize&imwidth=420",
  "marutisuzuki_invicto": "https://cdn-s3.autocarindia.com/legacy/cdni/mmv_images/colors/20250429062358_Maruti_Suzuki_Invicto_Magnificient_Black[1].png?w=640&q=75&fm=auto",
  "maruti_invicto": "https://cdn-s3.autocarindia.com/legacy/cdni/mmv_images/colors/20250429062358_Maruti_Suzuki_Invicto_Magnificient_Black[1].png?w=640&q=75&fm=auto",
  "marutisuzuki_alto800": "https://www.marutiseva.com/assets/images/alto/Alto800_Superior_White_New.png",
  "maruti_alto800": "https://www.marutiseva.com/assets/images/alto/Alto800_Superior_White_New.png",
  "marutisuzuki_alto": "https://stimg.cardekho.com/images/car-images/large/Maruti/Maruti-Alto/047.jpg",
  "maruti_alto": "https://stimg.cardekho.com/images/car-images/large/Maruti/Maruti-Alto/047.jpg",

  // --- TOYOTA ---
  "toyota_fortuner": "https://img.autocarpro.in/autocarpro/709f4883-7b5d-48a5-8aee-b556afd7e4f4_Fortuner-Leader-white.jpg?w=750&h=490&q=75&c=1",
  "toyota_fortunerlegender": "https://imgd.aeplcdn.com/664x374/n/cw/ec/137767/fortuner-legender-exterior-right-front-three-quarter-5.png?isig=0&q=80",
  "toyota_legender": "https://imgd.aeplcdn.com/664x374/n/cw/ec/137767/fortuner-legender-exterior-right-front-three-quarter-5.png?isig=0&q=80",
  "toyota_urbancruiserhyryder": "https://d2dbmkua9abaw6.cloudfront.net/uploads/products/New-Project--24--20260615-07f8aebf-2435-457f-92b7-9a020a47f8db.webp",
  "toyota_hyryder": "https://d2dbmkua9abaw6.cloudfront.net/uploads/products/New-Project--24--20260615-07f8aebf-2435-457f-92b7-9a020a47f8db.webp",
  "toyota_hilux": "https://imgd.aeplcdn.com/664x374/n/5tprgkb_1978880.jpg?q=80",
  "toyota_innova": "https://imgd.aeplcdn.com/1200x900/n/cw/ec/136051/toyota-innova-hycross-left-front-three-quarter0.jpeg?isig=0&wm=0",
  "toyota_innovahycross": "https://imgd.aeplcdn.com/1200x900/n/cw/ec/136051/toyota-innova-hycross-left-front-three-quarter0.jpeg?isig=0&wm=0",
  "toyota_hycross": "https://imgd.aeplcdn.com/1200x900/n/cw/ec/136051/toyota-innova-hycross-left-front-three-quarter0.jpeg?isig=0&wm=0",
  "toyota_innovacrysta": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/222736/innova-crysta-2026-exterior-right-front-three-quarter.png?isig=0&q=80&q=80",
  "toyota_crysta": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/222736/innova-crysta-2026-exterior-right-front-three-quarter.png?isig=0&q=80&q=80",
  "toyota_vellfire": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Toyota/Vellfire/10337/1755846282322/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  "toyota_rumion": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Toyota/Rumion/8650/1773142465050/front-left-side-47.jpg",
  "toyota_glanza": "https://cdn-s3.autocarindia.com/legacy/cdni/Galleries/20190607105010_Toyota-Glanza-white-studio.jpg?w=728&q=75&fm=auto",
  "toyota_camry": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Toyota/Camry/11344/1773396920075/front-left-side-47.jpg",

  // --- HONDA ---
  "honda_city": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRGxU0RoeqPhuwUHithcfNvxSjQFpW-qdt8UXZsJGSBg53Uqz2BmXWD9s&s=10",
  "honda_amaze": "https://stimg.cardekho.com/pwa/img/quickverdict/amaze-removebg-preview.png",
  "honda_elevate": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Honda/Elevate/12099/1758802336858/front-left-side-47.jpg",

  // --- KIA ---
  "kia_carens": "https://cdn-s3.autocarindia.com/legacy/cdni/mmv_images/colors/20250808114824_Kia_Carens_Sparkling_Silver[1].png?w=728&q=75&fm=auto",
  "kia_carnival": "https://imgd.aeplcdn.com/664x374/n/cw/ec/138947/carnival-exterior-right-front-three-quarter-20.png?isig=0&q=80",
  "kia_seltos": "https://imgd-ct.aeplcdn.com/664x415/n/cw/ec/192817/seltos-exterior-left-front-three-quarter-70.jpeg?isig=0&q=80",
  "kia_sonet": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/174423/sonet-exterior-right-front-three-quarter-12.png?isig=0&q=80",

  // --- FORCE MOTORS ---
  "force_traveller": "https://saibabatravels.com/wp-content/uploads/2026/04/tempo-traveller-in-mumbai.jpg",
  "forcemotors_traveller": "https://saibabatravels.com/wp-content/uploads/2026/04/tempo-traveller-in-mumbai.jpg",
  "force_tempotraveller": "https://saibabatravels.com/wp-content/uploads/2026/04/tempo-traveller-in-mumbai.jpg",
  "force_urbania": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Force/Urbania/11849/1763466348855/front-left-side-47.jpg",
  "forcemotors_urbania": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Force/Urbania/11849/1763466348855/front-left-side-47.jpg",

  // --- RENAULT ---
  "renault_triber": "https://images.autox.com/uploads/2025/07/Renault-Triber-Ice-Cool-White-with-Black-Roof-1753417004044-500x261.webp",

  // --- MG ---
  "mg_hector": "https://asset.autocarindia.com/static/models/colors/20251215_102127_4146174e.png",
  "mg_astor": "https://mgmotor.scene7.com/is/image/mgmotor/as-img-dsc-0341?$mg-rgb-tablet-image-responsive$&fmt=png-alpha",
  "mg_gloster": "https://www.v3cars.com/cdn-cgi/image/width=1920%2Cquality=75%2Cformat=auto/https://assets.v3cars.com/media/model-imgs/304640candy-white.webp",

  // --- VOLKSWAGEN & SKODA ---
  "volkswagen_virtus": "https://imgd.aeplcdn.com/1600x900/n/cw/ec/188663/volkswagen-virtus-right-front-three-quarter2.jpeg?isig=0&q=75",
  "vw_virtus": "https://imgd.aeplcdn.com/1600x900/n/cw/ec/188663/volkswagen-virtus-right-front-three-quarter2.jpeg?isig=0&q=75",
  "skoda_slavia": "https://stimg.cardekho.com/images/carexteriorimages/630x420/Skoda/Slavia/11951/1779266772137/front-left-side-47.jpg",
  "volkswagen_taigun": "https://asset.carwyapar.com/Car%20Colors/Taigun/Reflex%20Silver.webp",
  "vw_taigun": "https://asset.carwyapar.com/Car%20Colors/Taigun/Reflex%20Silver.webp",
  "skoda_kushaq": "https://stimg.cardekho.com/images/carexteriorimages/930x620/Skoda/Kushaq/13279/1779266052419/front-left-side-47.jpg",
  "skoda_kodiaq": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8iI5cUe3mqEtrL-R0IXA-_eqpBfznz04U0JHOZ4RsAA&s=10",
  "volkswagen_tiguan": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/53123/tiguan-exterior-right-front-three-quarter-5.jpeg?q=80&q=80",
  "vw_tiguan": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/53123/tiguan-exterior-right-front-three-quarter-5.jpeg?q=80&q=80",

  // --- JEEP ---
  "jeep_compass": "https://di-uploads-pod10.dealerinspire.com/dupagecdjr/uploads/2017/04/19Jeep-Compass-Jellybean-Altitude-GraniteCrystalMet.png",
  "jeep_meridian": "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/47139/meridian-exterior-right-front-three-quarter-18.png?isig=0&q=80",
  "jeep_wrangler": "https://assets.v3cars.com/media/model-imgs/883610wrangler.png",

  // --- ROYAL ENFIELD ---
  "royalenfield_classic350": "https://www.bikewale.com/n/cw/ec/1/versions/royalenfield-classic-350-heritage-premium1784198516630.jpg",
  "royalenfield_classic": "https://www.bikewale.com/n/cw/ec/1/versions/royalenfield-classic-350-heritage-premium1784198516630.jpg",
  "royalenfield_bullet350": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/127499/bullet-right-side-view-4.jpeg?isig=0",
  "royalenfield_bullet": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/127499/bullet-right-side-view-4.jpeg?isig=0",
  "royalenfield_hunter350": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/201293/hunter-350-right-side-view-13.png?isig=0",
  "royalenfield_hunter": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/201293/hunter-350-right-side-view-13.png?isig=0",
  "royalenfield_meteor350": "https://www.bikewale.com/n/glk9hhb_1871293.jpg",
  "royalenfield_meteor": "https://www.bikewale.com/n/glk9hhb_1871293.jpg",
  "royalenfield_himalayan450": "https://cdn.bikedekho.com/processedimages/royal-enfield/himalayan-450/source/himalayan-45069cba72ab286c.jpg?imwidth=412&impolicy=resize",
  "royalenfield_himalayan": "https://cdn.bikedekho.com/processedimages/royal-enfield/himalayan-450/source/himalayan-45069cba72ab286c.jpg?imwidth=412&impolicy=resize",
  "royalenfield_continentalgt650": "https://www.bikewale.com/n/jpvbqkb_1989989.png",
  "royalenfield_continentalgt": "https://www.bikewale.com/n/jpvbqkb_1989989.png",
  "royalenfield_gt650": "https://www.bikewale.com/n/jpvbqkb_1989989.png",
  "royalenfield_interceptor650": "https://www.bikewale.com/n/7mapseb_1777201.jpg",
  "royalenfield_interceptor": "https://www.bikewale.com/n/7mapseb_1777201.jpg",

  // --- YAMAHA ---
  "yamaha_r15v4": "https://shop.yamaha-motor-india.com/cdn/shop/files/dark_knight_79a4073e-f508-40e3-a53b-d025caa23172_1200x.webp?v=1788784021",
  "yamaha_r15": "https://shop.yamaha-motor-india.com/cdn/shop/files/dark_knight_79a4073e-f508-40e3-a53b-d025caa23172_1200x.webp?v=1788784021",
  "yamaha_mt15": "https://imgd.aeplcdn.com/664x374/n/cw/ec/1/versions/yamaha-mt-15-standard-20241759582770305.jpg?q=80",
  "yamaha_mt15v2": "https://imgd.aeplcdn.com/664x374/n/cw/ec/1/versions/yamaha-mt-15-standard-20241759582770305.jpg?q=80",
  "yamaha_fzs": "https://www.bikewale.com/n/cw/ec/111153/fz-s-right-front-three-quarter-3.png?isig=0",
  "yamaha_fz": "https://www.bikewale.com/n/cw/ec/111153/fz-s-right-front-three-quarter-3.png?isig=0",
  "yamaha_aerox155": "https://www.bikewale.com/n/cw/ec/1/versions/yamaha-aerox-155-s1746512275409.jpg",
  "yamaha_aerox": "https://www.bikewale.com/n/cw/ec/1/versions/yamaha-aerox-155-s1746512275409.jpg",
  "yamaha_rayzr": "https://www.bikewale.com/n/cw/ec/225967/ray-zr-125-right-front-three-quarter.png?isig=0",
  "yamaha_rayzr125": "https://www.bikewale.com/n/cw/ec/225967/ray-zr-125-right-front-three-quarter.png?isig=0",

  // --- HONDA 2WHEELERS ---
  "honda_activa6g": "https://mc.bajajfinserv.in/media/catalog/product/h/o/hondaactiva6gpremiumeditiondeluxeblack_base_2_2.jpeg",
  "honda_activa": "https://mc.bajajfinserv.in/media/catalog/product/h/o/hondaactiva6gpremiumeditiondeluxeblack_base_2_2.jpeg",
  "honda_activa125": "https://mc.bajajfinserv.in/media/catalog/product/h/o/hondaactiva6gpremiumeditiondeluxeblack_base_2_2.jpeg",
  "honda_dio": "https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fbike-images%2Forig%2Fhonda%2Fdio%2Fhonda-dio.jpg%3Fv%3D74&w=1920&q=75",
  "honda_dio125": "https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fbike-images%2Forig%2Fhonda%2Fdio%2Fhonda-dio.jpg%3Fv%3D74&w=1920&q=75",
  "honda_shine125": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwDFthFEHVCy1igJRYEB5APWFm8WWd9GR0z4iyMN9QXA&s=10",
  "honda_shine": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwDFthFEHVCy1igJRYEB5APWFm8WWd9GR0z4iyMN9QXA&s=10",
  "honda_shine100": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwDFthFEHVCy1igJRYEB5APWFm8WWd9GR0z4iyMN9QXA&s=10",
  "honda_unicorn": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/1/versions/--disc-20251735194316753.jpg",
  "honda_cb350": "https://imgd.aeplcdn.com/1056x594/n/lwasnfb_1825021.jpg?q=80",
  "honda_cb350rs": "https://imgd.aeplcdn.com/1056x594/n/lwasnfb_1825021.jpg?q=80",
  "honda_hnesscb350": "https://imgd.aeplcdn.com/1056x594/n/lwasnfb_1825021.jpg?q=80",

  // --- TVS ---
  "tvs_jupiter": "https://www.bikewale.com/n/t5dmojb_1960684.png",
  "tvs_jupiter125": "https://www.bikewale.com/n/t5dmojb_1960684.png",
  "tvs_jupiter110": "https://www.bikewale.com/n/t5dmojb_1960684.png",
  "tvs_ntorq125": "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20240809125240_TVS_NTORQ_Race_XP_Black.jpg?w=728&q=75",
  "tvs_ntorq": "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20240809125240_TVS_NTORQ_Race_XP_Black.jpg?w=728&q=75",
  "tvs_apachertr": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/204536/apache-200-right-front-three-quarter.jpeg?isig=0",
  "tvs_apache": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/204536/apache-200-right-front-three-quarter.jpeg?isig=0",
  "tvs_apachertr160": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/204536/apache-200-right-front-three-quarter.jpeg?isig=0",
  "tvs_apachertr200": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/204536/apache-200-right-front-three-quarter.jpeg?isig=0",
  "tvs_raider125": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/1/versions/tvs-raider-125-drum1782714870875.jpg",
  "tvs_raider": "https://imgd.aeplcdn.com/1280x720/n/cw/ec/1/versions/tvs-raider-125-drum1782714870875.jpg",
  "tvs_iqube": "https://www.tvsmotor.com/electric-scooters/tvs-iqube/-/media/Vehicles/Feature/Iqube/Variant/TVS-iQube-3-0-KW/Color-Images/Titanium-Grey/3-kw-titanium-grey-04.webp",
  "tvs_iqubest": "https://www.tvsmotor.com/electric-scooters/tvs-iqube/-/media/Vehicles/Feature/Iqube/Variant/TVS-iQube-3-0-KW/Color-Images/Titanium-Grey/3-kw-titanium-grey-04.webp",

  // --- BAJAJ (BIKES & AUTOS) ---
  "bajaj_pulsar150": "https://cdn.bikedekho.com/processedimages/bajaj/bajaj-pulsar-150/source/bajaj-pulsar-1506a1a6c393c1df.jpg",
  "bajaj_pulsar": "https://cdn.bikedekho.com/processedimages/bajaj/bajaj-pulsar-150/source/bajaj-pulsar-1506a1a6c393c1df.jpg",
  "bajaj_pulsarns200": "https://imgd.aeplcdn.com/310x174/n/cw/ec/178257/pulsar-n250-right-side-view-3.png?isig=0",
  "bajaj_pulsarns160": "https://imgd.aeplcdn.com/310x174/n/cw/ec/178257/pulsar-n250-right-side-view-3.png?isig=0",
  "bajaj_ns200": "https://imgd.aeplcdn.com/310x174/n/cw/ec/178257/pulsar-n250-right-side-view-3.png?isig=0",
  "bajaj_pulsar220f": "https://cdn.bajajauto.com/-/media/assets/bajajauto/bikes/pulsar-220f-2025/360-degree/web/blue/00.webp",
  "bajaj_pulsar220": "https://cdn.bajajauto.com/-/media/assets/bajajauto/bikes/pulsar-220f-2025/360-degree/web/blue/00.webp",
  "bajaj_platina": "https://cdn.bajajauto.com/-/media/assets/bajajauto/360degreeimages/bikes/platina-2026/platina-100/p100-black-and-white/00.png",
  "bajaj_platina100": "https://cdn.bajajauto.com/-/media/assets/bajajauto/360degreeimages/bikes/platina-2026/platina-100/p100-black-and-white/00.png",
  "bajaj_platina110": "https://cdn.bajajauto.com/-/media/assets/bajajauto/360degreeimages/bikes/platina-2026/platina-100/p100-black-and-white/00.png",
  "bajaj_chetakev": "https://m.media-amazon.com/images/I/61KNCfHKL0L._AC_UF1000,1000_QL80_.jpg",
  "bajaj_chetak": "https://m.media-amazon.com/images/I/61KNCfHKL0L._AC_UF1000,1000_QL80_.jpg",
  "bajaj_recompactauto": "https://cdn.bajajauto.com/-/media/bajaj-auto/new-webp/3-wheeler/savings_calculator_image_re_new.webp",
  "bajaj_re": "https://cdn.bajajauto.com/-/media/bajaj-auto/new-webp/3-wheeler/savings_calculator_image_re_new.webp",
  "bajaj_auto": "https://cdn.bajajauto.com/-/media/bajaj-auto/new-webp/3-wheeler/savings_calculator_image_re_new.webp",
  "bajaj_reauto": "https://cdn.bajajauto.com/-/media/bajaj-auto/new-webp/3-wheeler/savings_calculator_image_re_new.webp",
  "bajaj_maxima": "https://5.imimg.com/data5/OI/YV/MB/SELLER-25069748/bajaj-maxima-wider-diesel-bs6.jpg",
  "bajaj_maximac": "https://5.imimg.com/data5/OI/YV/MB/SELLER-25069748/bajaj-maxima-wider-diesel-bs6.jpg",
  "bajaj_maximaz": "https://5.imimg.com/data5/OI/YV/MB/SELLER-25069748/bajaj-maxima-wider-diesel-bs6.jpg",

  // --- KTM ---
  "ktm_duke200": "https://cdn.bajajauto.com/-/media/ktm/ktm-faq/new/ktm-bike-angle-5pm_200-duke-orange.webp",
  "ktm_duke250": "https://cdn.bajajauto.com/-/media/ktm/ktm-faq/new/ktm-bike-angle-5pm_200-duke-orange.webp",
  "ktm_duke125": "https://cdn.bajajauto.com/-/media/ktm/ktm-faq/new/ktm-bike-angle-5pm_200-duke-orange.webp",
  "ktm_duke390": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSj-h4TBdoVPQzZyb0lYiA86zDX2rznydYNqChXfvpsKwiX04mT5Qo7Kr1a&s=10",
  "ktm_rc200": "https://www.ktmindia.com/-/media/images/ktm/booking/ktm-pngs-and-webps/ktm-rc-200/rc-200black.webp",
  "ktm_rc390": "https://www.ktmindia.com/-/media/images/ktm/booking/ktm-pngs-and-webps/ktm-rc-200/rc-200black.webp",
  "ktm_adventure390": "https://cdn.bikedekho.com/processedimages/ktm/390-adventure-s/640X309/390-adventure-s6a0591db51544.jpg",
  "ktm_390adventure": "https://cdn.bikedekho.com/processedimages/ktm/390-adventure-s/640X309/390-adventure-s6a0591db51544.jpg",

  // --- SUZUKI (2W) ---
  "suzuki_access125": "https://cdn.suzukimotorcycle.co.in/public-live/uploads/color-images/original/370-01-2025-Suzuki-Access-Website_Absolute-Side_620x428pix-03.png",
  "suzuki_access": "https://cdn.suzukimotorcycle.co.in/public-live/uploads/color-images/original/370-01-2025-Suzuki-Access-Website_Absolute-Side_620x428pix-03.png",
  "suzuki_burgmanstreet": "https://cdn.suzukimotorcycle.co.in/public-live/uploads/product-gallery-images/original/47/Prl.-Mat-Shadow-Green.jpg",
  "suzuki_burgman": "https://cdn.suzukimotorcycle.co.in/public-live/uploads/product-gallery-images/original/47/Prl.-Mat-Shadow-Green.jpg",
  "suzuki_gixxer": "https://ic4.maxabout.us/tr:w-250/autos/tw_india//S/2023/2/suzuki-gixxer-150-front-3-quarter-view.jpg",
  "suzuki_gixxersf": "https://ic4.maxabout.us/tr:w-250/autos/tw_india//S/2023/2/suzuki-gixxer-150-front-3-quarter-view.jpg",

  // --- PIAGGIO & COMMERCIAL ---
  "piaggio_apeauto": "https://5.imimg.com/data5/SELLER/Default/2023/10/351475365/FL/GY/UV/87053405/mahindra-ape-auto-dx-5-seater-cng-auto.png",
  "piaggio_ape": "https://5.imimg.com/data5/SELLER/Default/2023/10/351475365/FL/GY/UV/87053405/mahindra-ape-auto-dx-5-seater-cng-auto.png",
  "piaggio_apecity": "https://piaggio-cv.co.in/wp-content/themes/piaggio/assets/img/product/electric/e-city-fx-max/e-city-maxx.png",
  "tata_ace": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_dF1VNXqVItliSCm9OhYlUr2g9-DzNDhpeshZf_qZzA&s=10",
  "mahindra_boleromaxitruck": "https://5.imimg.com/data5/RW/PQ/LY/GLADMIN-107479/mahindra-bolero-maxi-truck-pickup-truck-payload-1000-kg-500x500.jpg",
  "mahindra_maxitruck": "https://5.imimg.com/data5/RW/PQ/LY/GLADMIN-107479/mahindra-bolero-maxi-truck-pickup-truck-payload-1000-kg-500x500.jpg",
};

interface VehicleMatchRule {
  patterns: string[];
  imageUrl: string;
}

const VEHICLE_IMAGE_RULES: VehicleMatchRule[] = [
  // 1. BMW Specific Model Rules (Ordered from specific sub-models to general series)
  {
    patterns: ["m340i", "m340"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/BMW/3-Series/10574/1761732994122/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  },
  {
    patterns: ["gran limousine", "granlimousine", "3 series gran limousine", "330li", "320ld", "3 series", "330i", "320d"],
    imageUrl: "https://images.91wheels.com/assets/c_images/gallery/bmw/3-series-gran-limousine/bmw-3-series-gran-limousine-7-1778487062.png",
  },
  {
    patterns: ["5 series", "530li", "520d", "530d", "520i", "530i", "530e"],
    imageUrl: "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/175183/5-series-exterior-right-front-three-quarter-95.png?isig=0&q=80&q=80",
  },
  {
    patterns: ["7 series", "740li", "740d", "730ld", "750li", "i7"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTM_8i6A1FThwj7Efa6D41K6l8U36kyDK93bNEB0wWVpSN432aZqsRLtKU&s=10",
  },
  {
    patterns: ["x7", "ix7", "x7 m60i", "x7 xdrive"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/cw/ec/136217/x7-exterior-right-front-three-quarter-10.png?isig=0&q=80",
  },
  {
    patterns: ["x5", "ix5", "x5 m", "x5 xdrive"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqOpEaUnSvg0nhvcsRT0RBQjs-VwGjVMFZjyMGNHcIvA&s=10",
  },
  {
    patterns: ["x3", "ix3", "x3 m", "x3 xdrive"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/cw/ec/179903/x3-exterior-right-side-view.png?isig=0&q=80&q=80",
  },
  {
    patterns: ["x1", "ix1", "x1 sdrive", "x1 xdrive"],
    imageUrl: "https://bmw.scene7.com/is/image/BMW/X1_diesel:2to1?fmt=webp&wid=2560&fit=wrap%2C+1",
  },
  {
    patterns: ["z4", "z4 m40i"],
    imageUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80",
  },
  {
    patterns: ["m3", "m4", "m5", "m8"],
    imageUrl: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80",
  },
  {
    patterns: ["bmw", "bimmer"],
    imageUrl: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80",
  },

  // 2. Mercedes-Benz Specific Model Rules
  {
    patterns: ["g-wagon", "gwagon", "g wagon", "g 63", "g63", "g-class", "gclass", "g class", "g400d", "g 400d"],
    imageUrl: "https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fcar-images%2Forig%2Fmercedes-amg%2Fg-63%2Fmercedes-amg-g-63.jpg%3Fv%3D41&w=1920&q=75",
  },
  {
    patterns: ["c-class", "cclass", "c class", "c200", "c220d", "c300", "c300d", "c 200", "c 220d"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/930x620/Mercedes-Benz/C-Class/10858/1774342866770/front-left-side-47.jpg",
  },
  {
    patterns: ["s-class", "sclass", "s class", "s350d", "s400d", "s450", "s500", "s 350d", "s 450", "maybach s"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/930x620/Mercedes-Benz/S-Class/13591/1781510460490/front-left-side-47.jpg",
  },
  {
    patterns: ["gla", "gla class", "gla 200", "gla 220d", "gla200", "gla220d"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/kmq0lcb_1713621.jpg?q=80",
  },
  {
    patterns: ["glc", "glc class", "glc 300", "glc 220d", "glc300", "glc220d", "glc coupe"],
    imageUrl: "https://www.mercedes-benz.com.sg/content/dam/hq/passengercars/cars/glc/glc-suv-x254-fl-pi/overview/spa-highlights/02-2025/images/mercedes-benz-glc-suv-x254-spa-highlights-exterior-2400x2400-02-2025.jpg?im=Resize,width=1184",
  },
  {
    patterns: ["gle", "gle class", "gle 300d", "gle 450", "gle 400d", "gle300d", "gle450", "gle coupe"],
    imageUrl: "https://assets.v3cars.com/media/model-imgs/1698995084-mercedes-benz-gle.webp",
  },
  {
    patterns: ["gls", "gls class", "gls 400d", "gls 450", "gls400d", "gls450", "maybach gls"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Mercedes-Benz/GLS/9791/1763535546980/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  },
  {
    patterns: ["mercedes", "mercedes-benz", "amg", "maybach"],
    imageUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80",
  },

  // 3. Audi Specific Model Rules (Ordered from specific sub-models / trims to general lines)
  {
    patterns: ["rs q8", "rsq8", "rs-q8"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Audi/RS-Q8/12377/1757402656751/front-left-side-47.jpg",
  },
  {
    patterns: ["q3 sportback", "q3sportback", "q3-sportback", "q3"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/930x620/Audi/Q3-Sportback/10568/1757140731610/front-left-side-47.jpg",
  },
  {
    patterns: ["q8", "audi q8", "sq8", "q8 e-tron", "q8 55 tfsi"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Audi/RS-Q8/12377/1757402656751/front-left-side-47.jpg",
  },
  {
    patterns: ["q7", "audi q7", "sq7", "q7 45", "q7 55", "q7 tfsi"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCBVhQA-jE8_lbchc5wV4RoG2KBzjSiud6xVpMh3nJsbxGQ9EDXBvgztw&s=10",
  },
  {
    patterns: ["q5", "audi q5", "sq5", "q5 sportback", "q5 tfsi"],
    imageUrl: "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/53591/q5-exterior-right-front-three-quarter-37.png?isig=0&q=80&q=80",
  },
  {
    patterns: ["a8l", "a8 l", "a8", "audi a8", "audi a8l", "s8"],
    imageUrl: "https://www.motorbeam.com/wp-content/uploads/2015-Audi-A8L-Security-Showcase.jpg",
  },
  {
    patterns: ["a6", "audi a6", "a6 matrix", "s6", "rs6"],
    imageUrl: "https://images.hgmsites.net/lrg/2025-audi-a6-performance-4-0-tfsi-quattro-angular-front-exterior-view_100965885_l.webp",
  },
  {
    patterns: ["a4", "audi a4", "s4", "rs4", "a4 tfsi"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuqD2Za5OBxnvlqTUfVrIi5CGQHl1f2CROZA5OG91MRMQdinUJGO_FDTVa&s=10",
  },
  {
    patterns: ["audi", "e-tron", "etron", "rs5", "rs7", "tt", "r8"],
    imageUrl: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=600&q=80",
  },

  // 4. Mahindra Specific Model Rules (Strict sub-model isolation)
  {
    patterns: ["thar roxx", "tharroxx", "roxx", "thar 5 door", "thar 5-door"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Mahindra/Thar-ROXX/11939/1778649951124/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  },
  {
    patterns: ["thar", "thar 4x4", "thar rwd", "thar earth", "mahindra thar"],
    imageUrl: "https://img.gaadicdn.com/images/car-images/large/Mahindra/Thar/12264/1759493860311/GALAXY-GREY_3d414b.jpg",
  },
  {
    patterns: ["scorpio classic", "scorpioclassic", "scorpio s11", "scorpio s9", "scorpio s7", "scorpio s5", "scorpio s3", "scorpio s"],
    imageUrl: "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/128413/scorpio-exterior-right-front-three-quarter-2.png?isig=0&q=80&q=80",
  },
  {
    patterns: ["scorpio n", "scorpion", "scorpio-n", "scorpio z8", "scorpio z4", "scorpio z6", "scorpio z2", "scorpio", "mahindra scorpio"],
    imageUrl: "https://stimg.cardekho.com/images/car-images/930x620/Mahindra/Scorpio-N/13746/1785924987591/EVEREST-WHITE_d1d3d5.jpg",
  },
  {
    patterns: ["xuv 3xo", "xuv3xo", "3xo", "xuv300", "xuv 300", "xuv300 turbosport"],
    imageUrl: "https://imgd.aeplcdn.com/642x361/n/cw/ec/175965/mahindra-xuv-3xo-right-front-three-quarter1.jpeg?isig=0&q=75",
  },
  {
    patterns: ["xuv700", "xuv 700", "xuv500", "xuv 500", "xuv400", "xuv 400", "xuv", "mahindra xuv"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7MqW4wMcx9gWJFxoXrFjdjOfK8A_5N5EKl4-r_Uh_mw&s=10",
  },
  {
    patterns: ["bolero neo", "boleroneo", "bolero neo plus", "neo plus", "neo"],
    imageUrl: "https://img.gaadicdn.com/images/car-images/large/Mahindra/Bolero-Neo/8506/1626171945457/225_dimaond-white_ffffff.jpg",
  },
  {
    patterns: ["bolero", "bolero power+", "bolero b6", "bolero b4", "bolero plus", "mahindra bolero"],
    imageUrl: "https://d2dbmkua9abaw6.cloudfront.net/uploads/products/Mahindra-Bolero-20260716-faee7c7a-7110-4e5a-b7cc-337eaad65811.webp",
  },

  // 5. Off-Roaders & Heavy 4x4s
  {
    patterns: ["wrangler", "jimny", "rubicon", "gurkha"],
    imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80",
  },
  // 6. Land Rover & Range Rover Specific Model Rules
  {
    patterns: ["defender", "defender 110", "defender 90", "defender 130", "land rover defender"],
    imageUrl: "https://images.91wheels.com/assets/c_images/gallery/landrover/defender/landrover-defender-0-1773131194.png",
  },
  {
    patterns: ["velar", "range rover velar"],
    imageUrl: "https://media.cdn-jaguarlandrover.com/api/v2/images/120085/w/640/h/360.jpg",
  },
  {
    patterns: ["evoque", "range rover evoque"],
    imageUrl: "https://images.91wheels.com/assets/c_images/gallery/landrover/range-rover-evoque/landrover-range-rover-evoque-2-1767932428.png",
  },
  {
    patterns: ["range rover sport", "rrsport", "sport dynamic", "range rover sport sv"],
    imageUrl: "https://static-cdn.team-bhp.com/prod/new-car-cms/Land-Rover/Range-Rover-Sport/2024/04/01/ab053d81-a777-47ce-ae93-6a38a5382c11-Land-Rover_Range-Rover-Sport_Fuji-White.png?w=688&dpr=3&optimize=low&format=auto&quality=50",
  },
  {
    patterns: ["discovery", "discovery sport", "land rover discovery"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Land-Rover/Discovery/8520/1767783067458/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  },
  {
    patterns: ["range rover", "vogue", "autobiography", "land rover", "landrover", "freelander"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Land-Rover/Land-Rover-Range-Rover-2009-2010/4020/1561450249119/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  },
  // 7. Toyota Specific Model Rules (Strict Sibling Isolation: Fortuner Legender vs Base Fortuner, Crysta vs Hycross, Vellfire, Rumion, Glanza, Camry)
  {
    patterns: ["fortuner legender", "legender", "fortuner gr-s", "fortuner gr sport", "fortuner gr"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/cw/ec/137767/fortuner-legender-exterior-right-front-three-quarter-5.png?isig=0&q=80",
  },
  {
    patterns: ["fortuner", "fortuner leader", "toyota fortuner"],
    imageUrl: "https://img.autocarpro.in/autocarpro/709f4883-7b5d-48a5-8aee-b556afd7e4f4_Fortuner-Leader-white.jpg?w=750&h=490&q=75&c=1",
  },
  {
    patterns: ["innova crysta", "crysta", "innova crysta 2026"],
    imageUrl: "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/222736/innova-crysta-2026-exterior-right-front-three-quarter.png?isig=0&q=80&q=80",
  },
  {
    patterns: ["innova hycross", "hycross", "innova", "toyota innova"],
    imageUrl: "https://imgd.aeplcdn.com/1200x900/n/cw/ec/136051/toyota-innova-hycross-left-front-three-quarter0.jpeg?isig=0&wm=0",
  },
  {
    patterns: ["vellfire", "toyota vellfire"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Toyota/Vellfire/10337/1755846282322/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  },
  {
    patterns: ["rumion", "toyota rumion"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/930x620/Toyota/Rumion/8650/1773142465050/front-left-side-47.jpg",
  },
  {
    patterns: ["urban cruiser hyryder", "hyryder", "urban cruiser"],
    imageUrl: "https://d2dbmkua9abaw6.cloudfront.net/uploads/products/New-Project--24--20260615-07f8aebf-2435-457f-92b7-9a020a47f8db.webp",
  },
  {
    patterns: ["glanza", "toyota glanza"],
    imageUrl: "https://cdn-s3.autocarindia.com/legacy/cdni/Galleries/20190607105010_Toyota-Glanza-white-studio.jpg?w=728&q=75&fm=auto",
  },
  {
    patterns: ["camry", "camry hybrid", "toyota camry"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Toyota/Camry/11344/1773396920075/front-left-side-47.jpg",
  },
  {
    patterns: ["hilux", "toyota hilux"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/5tprgkb_1978880.jpg?q=80",
  },

  // 8. Tata Motors Specific Model Rules (Safari vs Harrier vs Nexon vs Punch vs Curvv vs Altroz vs Tiago vs Tigor)
  {
    patterns: ["curvv", "curvv ev"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv5CPd3qr2SChdyCBLH7753Wg5YUl11B77ENZguedDwaQD3UivZNi0jaM&s=10",
  },
  {
    patterns: ["safari", "safari dark", "safari red dark", "tata safari"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/930x620/Tata/Safari/12790/1785837912567/front-left-side-47.jpg",
  },
  {
    patterns: ["harrier", "harrier ev", "harrier dark", "tata harrier"],
    imageUrl: "https://img.gaadicdn.com/images/car-images/large/Tata/Harrier/12822/1773399746131/Pristine-White_eeeef0.jpg",
  },
  {
    patterns: ["nexon", "nexon ev", "nexon dark", "tata nexon"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYJFlHeBbTq6aXNPc49LV-maZ_m9RexVNQsaZN3wGDsg&s=10",
  },
  {
    patterns: ["punch", "punch ev", "tata punch"],
    imageUrl: "https://ackodrive-prod.ackoassets.com/image/tata/model4798/daytona-grey/default/Transparent.png",
  },
  {
    patterns: ["altroz", "altroz racer", "altroz ev", "altroz dca", "tata altroz"],
    imageUrl: "https://malikautoworld.com/wp-content/uploads/2025/05/RoyalBlue-0-4.png",
  },
  {
    patterns: ["tiago", "tiago ev", "tiago nrg", "tata tiago"],
    imageUrl: "https://asset.carwyapar.com/Car%20Images/Tata/Tiago/Tiago%20XZ/Tata%20Tiago%20%20XZ%201.webp",
  },
  {
    patterns: ["tigor", "tigor ev", "tata tigor"],
    imageUrl: "https://motoroctane.com/wp-content/uploads/2018/10/Tigor.jpg",
  },

  // 9. Hyundai Specific Model Rules (Creta vs Venue vs Alcazar vs Exter vs Tucson vs i20 vs Grand i10 vs Verna vs Aura)
  {
    patterns: ["alcazar", "alcazar signature", "hyundai alcazar"],
    imageUrl: "https://www.indiacarnews.com/wp-content/uploads/2021/06/Hyundai-Alcazar-Dual-tone-price.jpg",
  },
  {
    patterns: ["tucson", "tucson signature", "hyundai tucson"],
    imageUrl: "https://mc.bajajfinserv.in/media/catalog/product/h/y/hyundaitucsonplatinumdieselatstarrynight_base.jpeg",
  },
  {
    patterns: ["exter", "exter knight", "hyundai exter"],
    imageUrl: "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/216807/exter-exterior-right-front-three-quarter.png?isig=0&q=80&q=80",
  },
  {
    patterns: ["venue", "venue n line", "venue n-line", "hyundai venue"],
    imageUrl: "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20190523032626_Hyundai-Venue-white.jpg?w=728&q=75&fm=auto",
  },
  {
    patterns: ["creta", "creta n line", "creta n-line", "creta ev", "hyundai creta"],
    imageUrl: "https://ackodrive-prod.ackoassets.com/image/hyundai/creta/default/Hero-Transparent.png",
  },
  {
    patterns: ["i20", "i20 n line", "i20 n-line", "elite i20", "hyundai i20"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Hyundai/i20/11092/1755774177956/front-left-side-47.jpg",
  },
  {
    patterns: ["grand i10 nios", "grandi10 nios", "grand i10", "grandi10", "i10 nios", "i10", "hyundai i10", "hyundai grand i10"],
    imageUrl: "https://stimg.cardekho.com/pwa/img/quickverdict/Grand_i10_nios-removebg-preview.png",
  },
  {
    patterns: ["verna", "verna turbo", "fluidic verna", "hyundai verna"],
    imageUrl: "https://www.hyundai.com/content/dam/hyundai/in/en/data/vehicle-thumbnail/Thumbnail/verna_thumbanil_pc.png",
  },
  {
    patterns: ["aura", "aura cng", "hyundai aura"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139133/aura-exterior-right-front-three-quarter-9.png?isig=0&q=80",
  },

  // 10. Maruti Suzuki Specific Model Rules (Sibling isolation: Ertiga vs XL6 vs Eeco vs Invicto vs Dzire vs Swift vs Baleno vs WagonR vs Alto vs Celerio vs Ignis vs Ciaz)
  {
    patterns: ["invicto", "maruti invicto", "suzuki invicto"],
    imageUrl: "https://cdn-s3.autocarindia.com/legacy/cdni/mmv_images/colors/20250429062358_Maruti_Suzuki_Invicto_Magnificient_Black[1].png?w=640&q=75&fm=auto",
  },
  {
    patterns: ["xl6", "maruti xl6", "xl 6", "suzuki xl6"],
    imageUrl: "https://imgd.aeplcdn.com/1200x900/n/cw/ec/120705/maruti-suzuki-xl6-right-front-three-quarter0.jpeg?isig=0&wm=0",
  },
  {
    patterns: ["ertiga", "maruti ertiga", "ertiga tour", "suzuki ertiga"],
    imageUrl: "https://imgd.aeplcdn.com/370x208/cw/ec/34140/Maruti-Suzuki-Ertiga-Exterior-125954.jpg?wm=1&q=80",
  },
  {
    patterns: ["eeco", "maruti eeco", "eeco cargo", "eeco 7 seater"],
    imageUrl: "https://stimg.cardekho.com/images/car-images/large/Maruti/Eeco/9455/Maruti-Eeco-7-Seater-STD/1669179092994/225_glistening-grey_57575a.jpg?impolicy=resize&imwidth=420",
  },
  {
    patterns: ["grand vitara", "grandvitara", "grand vitara hybrid"],
    imageUrl: "https://imgd.aeplcdn.com/600x600/n/cw/ec/134801/maruti-suzuki-grand-vitara-right-front-three-quarter0.jpeg?isig=0&wm=0",
  },
  {
    patterns: ["fronx", "fronx turbo"],
    imageUrl: "https://tb-static.uber.com/prod/vehicles-importer/2024/maruti-suzuki/fronx/high_res/1567890275497.png",
  },
  {
    patterns: ["jimny", "jimny 5 door", "jimny 5-door", "jimny alpha", "jimny zeta"],
    imageUrl: "https://ackodrive-prod.ackoassets.com/image/maruti-suzuki/jimny/default/Hero-Transparent.png",
  },
  {
    patterns: ["brezza", "vitara brezza", "brezza zxi"],
    imageUrl: "https://static-cdn.cars24.com/prod/auto-news24-cms/cars24-blog-images/2026/03/01/985c2789-a134-4c92-9e56-5a71dc8c322b-complete-guide-on-buying-a-maruti-suzuki-brezza-.webp",
  },
  {
    patterns: ["swift dzire", "swiftdzire", "dzire", "maruti dzire"],
    imageUrl: "https://static.caronphone.com/public/brands/21/493/2518/2518_1731400408.webp",
  },
  {
    patterns: ["swift", "maruti swift", "swift zxi", "swift vxi"],
    imageUrl: "https://images.91wheels.com/assets/c_images/gallery/maruti/swift/maruti-swift-7-1767861017.png?w=600&q=40",
  },
  {
    patterns: ["baleno", "baleno rs", "maruti baleno"],
    imageUrl: "https://www.spinny.com/blog/wp-content/uploads/2025/03/Maruti-Suzuki-Baleno-Safety-Rating-NCAP-Rating-Safety-Features-jpg.webp",
  },
  {
    patterns: ["wagon r", "wagonr", "wagon-r", "maruti wagonr"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtiiWv4UGsY4VCMohTEyeBnpktCxoSCf5xB1UP-e7HQw&s=10",
  },
  {
    patterns: ["alto 800", "alto800", "alto-800"],
    imageUrl: "https://www.marutiseva.com/assets/images/alto/Alto800_Superior_White_New.png",
  },
  {
    patterns: ["alto k10", "altok10", "alto-k10"],
    imageUrl: "https://images.91wheels.com/assets/c_images/gallery/maruti/alto-k10/maruti-alto-k10-10-1766734886.png?w=520&q=40",
  },
  {
    patterns: ["alto", "maruti alto"],
    imageUrl: "https://stimg.cardekho.com/images/car-images/large/Maruti/Maruti-Alto/047.jpg",
  },
  {
    patterns: ["celerio", "celerio x", "maruti celerio"],
    imageUrl: "https://www.varunmaruti.com/uploads/products/colors/celerio-pearl-midnight-black.png",
  },
  {
    patterns: ["ignis", "maruti ignis"],
    imageUrl: "https://d147al5y0i1rb.cloudfront.net/uploads/leasing/offer/image/30461/suzuki-ignis-hybrid-adventure_GoMore_1678455505.png?ixlib=rails-4.3.1&auto=format%2Ccompress&w=420&h=279&fit=clip&dpr=3",
  },
  {
    patterns: ["ciaz", "maruti ciaz"],
    imageUrl: "https://images.garipoint.com/get_new_car_images.php?width=580&height=320&path=model_images/maruti/ciaz/maruti-ciaz-Pearl-Midnight-Black.jpg",
  },

  // 11. Kia Specific Model Rules (Carens vs Carnival vs Seltos vs Sonet)
  {
    patterns: ["carnival", "carnival limousine", "kia carnival"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/cw/ec/138947/carnival-exterior-right-front-three-quarter-20.png?isig=0&q=80",
  },
  {
    patterns: ["carens", "carens clavis", "kia carens"],
    imageUrl: "https://cdn-s3.autocarindia.com/legacy/cdni/mmv_images/colors/20250808114824_Kia_Carens_Sparkling_Silver[1].png?w=728&q=75&fm=auto",
  },
  {
    patterns: ["seltos", "seltos x-line", "seltos gt line", "seltos x line", "kia seltos"],
    imageUrl: "https://imgd-ct.aeplcdn.com/664x415/n/cw/ec/192817/seltos-exterior-left-front-three-quarter-70.jpeg?isig=0&q=80",
  },
  {
    patterns: ["sonet", "sonet x-line", "sonet gt line", "kia sonet"],
    imageUrl: "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/174423/sonet-exterior-right-front-three-quarter-12.png?isig=0&q=80",
  },

  // 12. Force Motors Specific Rules (Traveller vs Urbania)
  {
    patterns: ["urbania", "force urbania", "forcemotors urbania"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/930x620/Force/Urbania/11849/1763466348855/front-left-side-47.jpg",
  },
  {
    patterns: ["traveller", "tempo traveller", "force traveller", "force tempo", "tempotraveller"],
    imageUrl: "https://saibabatravels.com/wp-content/uploads/2026/04/tempo-traveller-in-mumbai.jpg",
  },

  // 13. Renault Specific Rules (Triber vs Kiger vs Kwid)
  {
    patterns: ["triber", "renault triber"],
    imageUrl: "https://images.autox.com/uploads/2025/07/Renault-Triber-Ice-Cool-White-with-Black-Roof-1753417004044-500x261.webp",
  },

  // 14. MG Specific Model Rules
  {
    patterns: ["hector plus", "hectorplus", "hector", "mg hector"],
    imageUrl: "https://asset.autocarindia.com/static/models/colors/20251215_102127_4146174e.png",
  },
  {
    patterns: ["astor", "mg astor"],
    imageUrl: "https://mgmotor.scene7.com/is/image/mgmotor/as-img-dsc-0341?$mg-rgb-tablet-image-responsive$&fmt=png-alpha",
  },
  {
    patterns: ["gloster", "mg gloster"],
    imageUrl: "https://www.v3cars.com/cdn-cgi/image/width=1920%2Cquality=75%2Cformat=auto/https://assets.v3cars.com/media/model-imgs/304640candy-white.webp",
  },

  // 15. Volkswagen & Skoda Specific Model Rules
  {
    patterns: ["kodiaq", "kodiaq l&k", "skoda kodiaq"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8iI5cUe3mqEtrL-R0IXA-_eqpBfznz04U0JHOZ4RsAA&s=10",
  },
  {
    patterns: ["tiguan", "tiguan r-line", "volkswagen tiguan", "vw tiguan"],
    imageUrl: "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/53123/tiguan-exterior-right-front-three-quarter-5.jpeg?q=80&q=80",
  },
  {
    patterns: ["taigun", "taigun gt", "volkswagen taigun", "vw taigun"],
    imageUrl: "https://asset.carwyapar.com/Car%20Colors/Taigun/Reflex%20Silver.webp",
  },
  {
    patterns: ["kushaq", "kushaq monte carlo", "skoda kushaq"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/930x620/Skoda/Kushaq/13279/1779266052419/front-left-side-47.jpg",
  },
  {
    patterns: ["virtus", "virtus gt", "volkswagen virtus", "vw virtus"],
    imageUrl: "https://imgd.aeplcdn.com/1600x900/n/cw/ec/188663/volkswagen-virtus-right-front-three-quarter2.jpeg?isig=0&q=75",
  },
  {
    patterns: ["slavia", "slavia monte carlo", "skoda slavia"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Skoda/Slavia/11951/1779266772137/front-left-side-47.jpg",
  },

  // 16. Honda Specific Model Rules
  {
    patterns: ["elevate", "honda elevate"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/930x620/Honda/Elevate/12099/1758802336858/front-left-side-47.jpg",
  },
  {
    patterns: ["city", "city e:hev", "city hybrid", "city zx", "honda city"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRGxU0RoeqPhuwUHithcfNvxSjQFpW-qdt8UXZsJGSBg53Uqz2BmXWD9s&s=10",
  },
  {
    patterns: ["amaze", "honda amaze"],
    imageUrl: "https://stimg.cardekho.com/pwa/img/quickverdict/amaze-removebg-preview.png",
  },

  // 17. Jeep Specific Model Rules
  {
    patterns: ["wrangler", "wrangler rubicon", "wrangler unlimited", "jeep wrangler"],
    imageUrl: "https://assets.v3cars.com/media/model-imgs/883610wrangler.png",
  },
  {
    patterns: ["meridian", "meridian overland", "jeep meridian"],
    imageUrl: "https://imgd.aeplcdn.com/1920x1080/n/cw/ec/47139/meridian-exterior-right-front-three-quarter-18.png?isig=0&q=80",
  },
  {
    patterns: ["compass", "compass trailhawk", "compass model s", "jeep compass"],
    imageUrl: "https://di-uploads-pod10.dealerinspire.com/dupagecdjr/uploads/2017/04/19Jeep-Compass-Jellybean-Altitude-GraniteCrystalMet.png",
  },

  // 18. Other Large SUVs & Off-Roaders
  {
    patterns: ["endeavour", "prado", "land cruiser", "pajero"],
    imageUrl: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=600&q=80",
  },
  // 19. Other Compact SUVs & Crossovers
  {
    patterns: ["magnite", "basalt"],
    imageUrl: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80",
  },
  // 20. Porsche Specific Model Rules
  {
    patterns: ["911", "carrera", "gt3", "gt3 rs", "gt2 rs", "targa", "turbo s", "718", "boxster", "cayman"],
    imageUrl: "https://stimg.cardekho.com/images/carexteriorimages/630x420/Porsche/911/11757/1762933836560/front-left-side-47.jpg?imwidth=420&impolicy=resize",
  },
  {
    patterns: ["panamera", "panamera gts", "panamera turbo"],
    imageUrl: "https://images.financialexpressdigital.com/2024/07/Porsche-Panamera-GTS.jpg",
  },
  {
    patterns: ["macan", "macan ev", "macan gts", "macan turbo"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0drOFcvuY_GiQfs7tf8H1KeZ94qWsJWHL7j36gpbmtCdGajISajZZK3eY&s=10",
  },
  {
    patterns: ["cayenne", "cayenne coupe", "cayenne turbo"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnPA2oCD70yYytleDBjcrat0LmO7Cxctzq86235UKqeVofIxVnOgDm1mrX&s=10",
  },
  {
    patterns: ["porsche", "taycan"],
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
  },

  // 21. Jaguar Specific Model Rules
  {
    patterns: ["f-pace", "fpace", "f pace", "i-pace", "ipace", "i pace", "e-pace", "epace"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/cw/ec/56265/f-pace-exterior-right-front-three-quarter-5.png?isig=0&q=80",
  },
  {
    patterns: ["xf", "jaguar xf", "xe", "jaguar xe", "xj", "jaguar xj", "xjl"],
    imageUrl: "https://www.v3cars.com/cdn-cgi/image/width=1920%2Cquality=75%2Cformat=auto/https://assets.v3cars.com/media/model-imgs/1625554503-Jaguar-XF.jpg",
  },
  {
    patterns: ["f-type", "ftype", "f type", "jaguar"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/cw/ec/56265/f-pace-exterior-right-front-three-quarter-5.png?isig=0&q=80",
  },

  // 22. Muscle / Sports Cars
  {
    patterns: ["mustang", "camaro", "challenger", "corvette", "supra", "ferrari", "lamborghini"],
    imageUrl: "https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=600&q=80",
  },
  // 23. MUVs & Family Haulers Generic Fallback
  {
    patterns: ["marazzo", "lodgy"],
    imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80",
  },
  // 24. General Hatchbacks Fallback
  {
    patterns: ["polo", "golf", "micra", "kwid", "s-presso", "santro"],
    imageUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80",
  },
  // 25. General Sedans Fallback
  {
    patterns: ["civic", "accord", "octavia", "superb", "elantra"],
    imageUrl: "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=600&q=80",
  },
  // 26. Royal Enfield Specific Model Rules
  {
    patterns: ["classic 350", "classic350", "re classic", "classic reborn", "classic 500", "royal enfield classic"],
    imageUrl: "https://www.bikewale.com/n/cw/ec/1/versions/royalenfield-classic-350-heritage-premium1784198516630.jpg",
  },
  {
    patterns: ["bullet 350", "bullet350", "re bullet", "bullet electra", "royal enfield bullet"],
    imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/127499/bullet-right-side-view-4.jpeg?isig=0",
  },
  {
    patterns: ["hunter 350", "hunter350", "re hunter", "hunter metro", "hunter dapper", "royal enfield hunter"],
    imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/201293/hunter-350-right-side-view-13.png?isig=0",
  },
  {
    patterns: ["meteor 350", "meteor350", "re meteor", "meteor fireball", "meteor stellar", "meteor supernova", "super meteor", "royal enfield meteor"],
    imageUrl: "https://www.bikewale.com/n/glk9hhb_1871293.jpg",
  },
  {
    patterns: ["himalayan 450", "himalayan450", "himalayan", "scram 411", "scram 440", "royal enfield himalayan"],
    imageUrl: "https://cdn.bikedekho.com/processedimages/royal-enfield/himalayan-450/source/himalayan-45069cba72ab286c.jpg?imwidth=412&impolicy=resize",
  },
  {
    patterns: ["continental gt 650", "continental gt650", "continental gt", "continentalgt", "gt 650", "gt650", "royal enfield continental"],
    imageUrl: "https://www.bikewale.com/n/jpvbqkb_1989989.png",
  },
  {
    patterns: ["interceptor 650", "interceptor650", "interceptor", "int 650", "int650", "royal enfield interceptor"],
    imageUrl: "https://www.bikewale.com/n/7mapseb_1777201.jpg",
  },

  // 27. Yamaha Specific Model Rules
  {
    patterns: ["r15 v4", "r15v4", "r15 v3", "r15m", "r15", "yamaha r15", "yzf r15"],
    imageUrl: "https://shop.yamaha-motor-india.com/cdn/shop/files/dark_knight_79a4073e-f508-40e3-a53b-d025caa23172_1200x.webp?v=1788784021",
  },
  {
    patterns: ["mt-15", "mt15", "mt 15", "mt-15 v2", "mt15 v2", "yamaha mt15", "yamaha mt-15"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/cw/ec/1/versions/yamaha-mt-15-standard-20241759582770305.jpg?q=80",
  },
  {
    patterns: ["fz-s", "fzs", "fz s", "fz-fi", "fz fi", "fz v3", "fz v4", "fz-x", "fzx", "fz", "yamaha fz", "yamaha fzs"],
    imageUrl: "https://www.bikewale.com/n/cw/ec/111153/fz-s-right-front-three-quarter-3.png?isig=0",
  },
  {
    patterns: ["aerox 155", "aerox155", "aerox", "yamaha aerox"],
    imageUrl: "https://www.bikewale.com/n/cw/ec/1/versions/yamaha-aerox-155-s1746512275409.jpg",
  },
  {
    patterns: ["rayzr", "ray-zr", "ray zr 125", "rayzr 125", "ray zr", "yamaha rayzr", "yamaha ray zr"],
    imageUrl: "https://www.bikewale.com/n/cw/ec/225967/ray-zr-125-right-front-three-quarter.png?isig=0",
  },

  // 28. Honda 2-Wheelers Specific Model Rules
  {
    patterns: ["activa 6g", "activa6g", "activa 125", "activa125", "activa 5g", "activa 4g", "activa 3g", "activa premium", "activa h-smart", "activa smart", "activa", "honda activa"],
    imageUrl: "https://mc.bajajfinserv.in/media/catalog/product/h/o/hondaactiva6gpremiumeditiondeluxeblack_base_2_2.jpeg",
  },
  {
    patterns: ["dio 125", "dio125", "dio h-smart", "dio", "honda dio"],
    imageUrl: "https://www.carandbike.com/_next/image?url=https%3A%2F%2Fimages.carandbike.com%2Fbike-images%2Forig%2Fhonda%2Fdio%2Fhonda-dio.jpg%3Fv%3D74&w=1920&q=75",
  },
  {
    patterns: ["shine 125", "shine125", "shine 100", "shine100", "shine sp", "sp 125", "sp125", "sp 160", "sp160", "shine", "honda shine"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwDFthFEHVCy1igJRYEB5APWFm8WWd9GR0z4iyMN9QXA&s=10",
  },
  {
    patterns: ["unicorn 160", "unicorn", "cb unicorn", "honda unicorn"],
    imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/1/versions/--disc-20251735194316753.jpg",
  },
  {
    patterns: ["cb350", "cb 350", "cb350rs", "cb 350 rs", "h'ness", "hness", "hness cb350", "honda cb350"],
    imageUrl: "https://imgd.aeplcdn.com/1056x594/n/lwasnfb_1825021.jpg?q=80",
  },

  // 29. TVS Specific Model Rules
  {
    patterns: ["jupiter 125", "jupiter125", "jupiter 110", "jupiter110", "jupiter zx", "jupiter classic", "jupiter", "tvs jupiter"],
    imageUrl: "https://www.bikewale.com/n/t5dmojb_1960684.png",
  },
  {
    patterns: ["ntorq 125", "ntorq125", "ntorq race xp", "ntorq race", "ntorq xt", "ntorq", "tvs ntorq"],
    imageUrl: "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20240809125240_TVS_NTORQ_Race_XP_Black.jpg?w=728&q=75",
  },
  {
    patterns: ["apache rtr 160", "apache rtr 200", "apache rtr 310", "apache rr 310", "apache rtr", "apache 160", "apache 200", "apache", "tvs apache"],
    imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/204536/apache-200-right-front-three-quarter.jpeg?isig=0",
  },
  {
    patterns: ["raider 125", "raider125", "raider smartxonnect", "raider", "tvs raider"],
    imageUrl: "https://imgd.aeplcdn.com/1280x720/n/cw/ec/1/versions/tvs-raider-125-drum1782714870875.jpg",
  },
  {
    patterns: ["iqube st", "iqube s", "iqube", "tvs iqube"],
    imageUrl: "https://www.tvsmotor.com/electric-scooters/tvs-iqube/-/media/Vehicles/Feature/Iqube/Variant/TVS-iQube-3-0-KW/Color-Images/Titanium-Grey/3-kw-titanium-grey-04.webp",
  },

  // 30. Bajaj Specific Model Rules
  {
    patterns: ["pulsar ns200", "pulsar ns 200", "pulsar ns160", "pulsar ns 160", "pulsar ns125", "pulsar ns400", "pulsar n250", "pulsar n160", "ns200", "ns160", "ns 200", "ns 160", "ns400", "n250", "n160", "bajaj ns200"],
    imageUrl: "https://imgd.aeplcdn.com/310x174/n/cw/ec/178257/pulsar-n250-right-side-view-3.png?isig=0",
  },
  {
    patterns: ["pulsar 220f", "pulsar 220 f", "pulsar 220", "pulsar220f", "pulsar220", "220f", "220 f", "bajaj pulsar 220"],
    imageUrl: "https://cdn.bajajauto.com/-/media/assets/bajajauto/bikes/pulsar-220f-2025/360-degree/web/blue/00.webp",
  },
  {
    patterns: ["pulsar 150", "pulsar 125", "pulsar standard", "pulsar neon", "pulsar", "bajaj pulsar"],
    imageUrl: "https://cdn.bikedekho.com/processedimages/bajaj/bajaj-pulsar-150/source/bajaj-pulsar-1506a1a6c393c1df.jpg",
  },
  {
    patterns: ["platina 100", "platina 110", "platina", "bajaj platina"],
    imageUrl: "https://cdn.bajajauto.com/-/media/assets/bajajauto/360degreeimages/bikes/platina-2026/platina-100/p100-black-and-white/00.png",
  },
  {
    patterns: ["chetak ev", "chetak", "bajaj chetak"],
    imageUrl: "https://m.media-amazon.com/images/I/61KNCfHKL0L._AC_UF1000,1000_QL80_.jpg",
  },
  {
    patterns: ["maxima c", "maxima z", "maxima cargo", "maxima passenger", "maxima", "bajaj maxima"],
    imageUrl: "https://5.imimg.com/data5/OI/YV/MB/SELLER-25069748/bajaj-maxima-wider-diesel-bs6.jpg",
  },
  {
    patterns: ["re compact", "re auto", "re optime", "bajaj auto", "bajaj re", "auto rickshaw", "autorickshaw", "re compact auto"],
    imageUrl: "https://cdn.bajajauto.com/-/media/bajaj-auto/new-webp/3-wheeler/savings_calculator_image_re_new.webp",
  },

  // 31. KTM Specific Model Rules
  {
    patterns: ["duke 390", "duke390", "390 duke", "ktm 390", "ktm duke 390"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSj-h4TBdoVPQzZyb0lYiA86zDX2rznydYNqChXfvpsKwiX04mT5Qo7Kr1a&s=10",
  },
  {
    patterns: ["duke 200", "duke200", "duke 250", "duke250", "duke 125", "duke125", "200 duke", "250 duke", "125 duke", "duke", "ktm duke"],
    imageUrl: "https://cdn.bajajauto.com/-/media/ktm/ktm-faq/new/ktm-bike-angle-5pm_200-duke-orange.webp",
  },
  {
    patterns: ["rc 200", "rc200", "rc 390", "rc390", "rc 125", "rc125", "rc", "ktm rc"],
    imageUrl: "https://www.ktmindia.com/-/media/images/ktm/booking/ktm-pngs-and-webps/ktm-rc-200/rc-200black.webp",
  },
  {
    patterns: ["adventure 390", "adventure390", "390 adventure", "390 adv", "adv 390", "adventure 250", "ktm adventure"],
    imageUrl: "https://cdn.bikedekho.com/processedimages/ktm/390-adventure-s/640X309/390-adventure-s6a0591db51544.jpg",
  },

  // 32. Suzuki 2W Specific Model Rules
  {
    patterns: ["access 125", "access125", "access ride connect", "access special", "access", "suzuki access"],
    imageUrl: "https://cdn.suzukimotorcycle.co.in/public-live/uploads/color-images/original/370-01-2025-Suzuki-Access-Website_Absolute-Side_620x428pix-03.png",
  },
  {
    patterns: ["burgman street", "burgmanstreet", "burgman 125", "burgman", "suzuki burgman"],
    imageUrl: "https://cdn.suzukimotorcycle.co.in/public-live/uploads/product-gallery-images/original/47/Prl.-Mat-Shadow-Green.jpg",
  },
  {
    patterns: ["gixxer sf 250", "gixxer sf", "gixxer 250", "gixxer 150", "gixxersf", "gixxer", "suzuki gixxer"],
    imageUrl: "https://ic4.maxabout.us/tr:w-250/autos/tw_india//S/2023/2/suzuki-gixxer-150-front-3-quarter-view.jpg",
  },

  // 33. Piaggio & Commercial Specific Model Rules
  {
    patterns: ["ape city", "apecity", "e-city", "e city", "piaggio ape city"],
    imageUrl: "https://piaggio-cv.co.in/wp-content/themes/piaggio/assets/img/product/electric/e-city-fx-max/e-city-maxx.png",
  },
  {
    patterns: ["ape auto", "apeauto", "ape dx", "ape xtra", "ape", "piaggio ape", "piaggio"],
    imageUrl: "https://5.imimg.com/data5/SELLER/Default/2023/10/351475365/FL/GY/UV/87053405/mahindra-ape-auto-dx-5-seater-cng-auto.png",
  },
  {
    patterns: ["tata ace", "chota hathi", "chotahathi", "ace gold", "ace ev", "ace zip", "ace mega", "ace"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_dF1VNXqVItliSCm9OhYlUr2g9-DzNDhpeshZf_qZzA&s=10",
  },
  {
    patterns: ["bolero maxi truck", "boleromaxitruck", "bolero maxi", "maxi truck", "maxitruck", "bolero pickup", "bolero camper", "mahindra maxi truck", "mahindra bolero maxi"],
    imageUrl: "https://5.imimg.com/data5/RW/PQ/LY/GLADMIN-107479/mahindra-bolero-maxi-truck-pickup-truck-payload-1000-kg-500x500.jpg",
  },

  // 34. Volvo Specific Model Rules
  {
    patterns: ["xc90", "xc 90", "ex90", "ex 90"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrLjAZoW3yhLCkp4n1d82rLpftQcKi0UQHGjym0VzwHSCtF5vPyD65VyyU&s=10",
  },
  {
    patterns: ["xc60", "xc 60", "ex60", "ex 60"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIWyoybqF2EjJVB8pJgtmfY9J93z6hBhTZtgW4POc9GqENlBSExanZ8xQ&s=10",
  },
  {
    patterns: ["xc40", "xc 40", "ex40", "ex 40", "c40", "c 40", "xc40 recharge", "c40 recharge"],
    imageUrl: "https://media.zigcdn.com/media/model/2026/Jul/front-left-quarter-view-157681838_930x620.jpg",
  },
  {
    patterns: ["s90", "s 90", "s60", "s 60", "v90", "v60"],
    imageUrl: "https://imgd.aeplcdn.com/664x374/n/cw/ec/131145/s90-exterior-right-front-three-quarter-4.jpeg?isig=0&q=80&q=80",
  },
  {
    patterns: ["volvo"],
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrLjAZoW3yhLCkp4n1d82rLpftQcKi0UQHGjym0VzwHSCtF5vPyD65VyyU&s=10",
  },

  // 35. Generic Fallback Rules
  {
    patterns: ["jawa", "yezdi", "harley", "cruiser", "ronin", "avenger"],
    imageUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80",
  },
  {
    patterns: ["ninja", "kawasaki", "hayabusa", "speed 400", "ducati", "triumph", "cbr", "splendor", "super splendor", "passion", "glamour", "dominar"],
    imageUrl: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80",
  },
  {
    patterns: ["vespa", "ola", "ather", "fascino", "destini", "pleasure", "scooter", "moped", "scooty", "s1 pro", "450x", "rizta"],
    imageUrl: "https://images.unsplash.com/photo-1593764592116-bfb2a97c642a?auto=format&fit=crop&w=600&q=80",
  },
  {
    patterns: ["tuk tuk", "treo", "atul", "3 wheeler", "three wheeler"],
    imageUrl: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=600&q=80",
  },
  {
    patterns: ["omni", "winger", "magic", "supro", "van"],
    imageUrl: "https://images.unsplash.com/photo-1527786356703-4b100091cd2c?auto=format&fit=crop&w=600&q=80",
  },
  {
    patterns: ["d-max", "isuzu", "jeeto", "dost", "bada dost", "intra", "super carry", "yodha", "truck", "lorry", "pickup"],
    imageUrl: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80",
  },
];

/**
 * Normalizes Make + Model string into a canonical lookup key.
 * Example: "BMW", "3 Series Gran Limousine" -> "bmw_3seriesgranlimousine"
 */
export function normalizeVehicleKey(make?: string, model?: string): string {
  const cleanMake = String(make || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanModel = String(model || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanMake}_${cleanModel}`;
}

/**
 * Returns a high-definition vehicle photo URL tailored to make, model, and body type.
 */
export function getVehicleImageUrl(
  make?: string,
  model?: string,
  vehicleType?: VehicleType | string
): string {
  const normMake = String(make || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normModel = String(model || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const combinedKey = `${normMake}_${normModel}`;

  // 1. Direct Lookup in EXACT_MODEL_IMAGES
  if (combinedKey && EXACT_MODEL_IMAGES[combinedKey]) {
    return EXACT_MODEL_IMAGES[combinedKey];
  }

  // 2. Model-only key check with brand prefixes
  const brandPrefixes = [
    'bmw_', 'mercedesbenz_', 'mercedes_', 'audi_', 'landrover_', 'rangerover_',
    'porsche_', 'volvo_', 'jaguar_', 'mahindra_', 'tata_', 'hyundai_',
    'marutisuzuki_', 'maruti_', 'suzuki_', 'toyota_', 'kia_', 'mg_',
    'volkswagen_', 'vw_', 'skoda_', 'jeep_', 'honda_', 'force_', 'forcemotors_',
    'renault_', 'royalenfield_', 'yamaha_', 'tvs_', 'bajaj_', 'ktm_', 'piaggio_'
  ];
  for (const prefix of brandPrefixes) {
    const prefixedKey = `${prefix}${normModel}`;
    if (EXACT_MODEL_IMAGES[prefixedKey]) {
      return EXACT_MODEL_IMAGES[prefixedKey];
    }
  }

  // 3. Secondary Token / Sub-Model Matching for Two-Wheelers & Commercials
  // Royal Enfield
  if (normMake.includes("royalenfield") || normMake === "re") {
    if (normModel.includes("classic")) return EXACT_MODEL_IMAGES["royalenfield_classic350"];
    if (normModel.includes("bullet")) return EXACT_MODEL_IMAGES["royalenfield_bullet350"];
    if (normModel.includes("hunter")) return EXACT_MODEL_IMAGES["royalenfield_hunter350"];
    if (normModel.includes("meteor")) return EXACT_MODEL_IMAGES["royalenfield_meteor350"];
    if (normModel.includes("himalayan")) return EXACT_MODEL_IMAGES["royalenfield_himalayan"];
    if (normModel.includes("continental") || normModel.includes("gt")) return EXACT_MODEL_IMAGES["royalenfield_continentalgt650"];
    if (normModel.includes("interceptor")) return EXACT_MODEL_IMAGES["royalenfield_interceptor650"];
  }

  // Yamaha
  if (normMake.includes("yamaha")) {
    if (normModel.includes("r15")) return EXACT_MODEL_IMAGES["yamaha_r15"];
    if (normModel.includes("mt15") || normModel.includes("mt-15")) return EXACT_MODEL_IMAGES["yamaha_mt15"];
    if (normModel.includes("fz")) return EXACT_MODEL_IMAGES["yamaha_fzs"];
    if (normModel.includes("aerox")) return EXACT_MODEL_IMAGES["yamaha_aerox155"];
    if (normModel.includes("rayzr") || normModel.includes("ray")) return EXACT_MODEL_IMAGES["yamaha_rayzr"];
  }

  // Honda 2W
  if (normMake.includes("honda")) {
    if (normModel.includes("activa")) return EXACT_MODEL_IMAGES["honda_activa"];
    if (normModel.includes("dio")) return EXACT_MODEL_IMAGES["honda_dio"];
    if (normModel.includes("shine")) return EXACT_MODEL_IMAGES["honda_shine125"];
    if (normModel.includes("unicorn")) return EXACT_MODEL_IMAGES["honda_unicorn"];
    if (normModel.includes("cb350") || normModel.includes("hness")) return EXACT_MODEL_IMAGES["honda_cb350"];
  }

  // TVS
  if (normMake.includes("tvs")) {
    if (normModel.includes("jupiter")) return EXACT_MODEL_IMAGES["tvs_jupiter"];
    if (normModel.includes("ntorq")) return EXACT_MODEL_IMAGES["tvs_ntorq125"];
    if (normModel.includes("apache")) return EXACT_MODEL_IMAGES["tvs_apachertr"];
    if (normModel.includes("raider")) return EXACT_MODEL_IMAGES["tvs_raider125"];
    if (normModel.includes("iqube")) return EXACT_MODEL_IMAGES["tvs_iqube"];
  }

  // Bajaj
  if (normMake.includes("bajaj")) {
    if (normModel.includes("ns200") || normModel.includes("ns160") || (normModel.includes("ns") && !normModel.includes("hness"))) return EXACT_MODEL_IMAGES["bajaj_pulsarns200"];
    if (normModel.includes("220f") || normModel.includes("220")) return EXACT_MODEL_IMAGES["bajaj_pulsar220f"];
    if (normModel.includes("pulsar")) return EXACT_MODEL_IMAGES["bajaj_pulsar150"];
    if (normModel.includes("platina")) return EXACT_MODEL_IMAGES["bajaj_platina"];
    if (normModel.includes("chetak")) return EXACT_MODEL_IMAGES["bajaj_chetakev"];
    if (normModel.includes("maxima")) return EXACT_MODEL_IMAGES["bajaj_maxima"];
    if (normModel.includes("auto") || normModel.includes("re")) return EXACT_MODEL_IMAGES["bajaj_recompactauto"];
  }

  // KTM
  if (normMake.includes("ktm")) {
    if (normModel.includes("duke390") || (normModel.includes("duke") && normModel.includes("390"))) return EXACT_MODEL_IMAGES["ktm_duke390"];
    if (normModel.includes("duke")) return EXACT_MODEL_IMAGES["ktm_duke200"];
    if (normModel.includes("rc")) return EXACT_MODEL_IMAGES["ktm_rc200"];
    if (normModel.includes("adventure") || normModel.includes("adv")) return EXACT_MODEL_IMAGES["ktm_adventure390"];
  }

  // Suzuki 2W
  if (normMake.includes("suzuki")) {
    if (normModel.includes("access")) return EXACT_MODEL_IMAGES["suzuki_access125"];
    if (normModel.includes("burgman")) return EXACT_MODEL_IMAGES["suzuki_burgmanstreet"];
    if (normModel.includes("gixxer")) return EXACT_MODEL_IMAGES["suzuki_gixxer"];
  }

  // Piaggio & Commercial
  if (normMake.includes("piaggio") || normModel.includes("ape")) {
    if (normModel.includes("city")) return EXACT_MODEL_IMAGES["piaggio_apecity"];
    return EXACT_MODEL_IMAGES["piaggio_apeauto"];
  }
  if (normMake.includes("tata") && normModel.includes("ace")) {
    return EXACT_MODEL_IMAGES["tata_ace"];
  }
  if (normMake.includes("mahindra") && normModel.includes("maxi")) {
    return EXACT_MODEL_IMAGES["mahindra_boleromaxitruck"];
  }

  const combined = `${make || ""} ${model || ""}`.toLowerCase().trim();
  const normalizedType = String(vehicleType || "").toUpperCase().trim();

  // 4. Search specific vehicle match rules by Make + Model combined tokens
  if (combined.length > 0) {
    for (const rule of VEHICLE_IMAGE_RULES) {
      for (const pattern of rule.patterns) {
        if (combined.includes(pattern)) {
          return rule.imageUrl;
        }
      }
    }
  }

  // 5. Fallback to Body Type image
  if (normalizedType && VEHICLE_TYPE_FALLBACK_IMAGES[normalizedType]) {
    return VEHICLE_TYPE_FALLBACK_IMAGES[normalizedType];
  }

  // 6. Global Default
  return VEHICLE_TYPE_FALLBACK_IMAGES.CAR;
}
