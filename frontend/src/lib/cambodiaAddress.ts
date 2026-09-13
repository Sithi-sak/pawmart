import addressData from '../data/cambodia-address.json'

export interface AddressCascaderNode {
  value: string
  label: string
  children?: AddressCascaderNode[]
}

interface VillageLocation {
  province: string
  district: string
  commune: string
  village: string
}

const villageLookup = new Map<string, VillageLocation>()

function buildOptions(): AddressCascaderNode[] {
  return addressData.provinces.map((province) => ({
    value: province.code,
    label: province.latin,
    children: province.districts.map((district) => ({
      value: district.code,
      label: district.latin,
      children: district.communes.map((commune) => ({
        value: commune.code,
        label: commune.latin,
        children: commune.villages.map((village) => {
          villageLookup.set(village.code, {
            province: province.latin,
            district: district.latin,
            commune: commune.latin,
            village: village.latin,
          })
          return { value: village.code, label: village.latin }
        }),
      })),
    })),
  }))
}

export const cambodiaAddressOptions: AddressCascaderNode[] = buildOptions()

export function describeVillage(villageCode: string): string | null {
  const location = villageLookup.get(villageCode)
  if (!location) return null
  return `${location.village}, ${location.commune}, ${location.district}, ${location.province}`
}
