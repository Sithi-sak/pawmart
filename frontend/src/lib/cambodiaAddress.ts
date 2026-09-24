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

// customers.location is free text; the profile stores it as
// "District, Province" so it reads naturally and can be matched back to
// codes (e.g. to pre-select checkout's province/district pickers).
export function formatLocation(provinceCode: string, districtCode: string): string {
  const province = cambodiaAddressOptions.find((p) => p.value === provinceCode)
  if (!province) return ''
  const district = province.children?.find((d) => d.value === districtCode)
  return district ? `${district.label}, ${province.label}` : province.label
}

export function parseLocation(location: string | null): {
  provinceCode: string
  districtCode: string
} {
  const parts = (location ?? '').split(',').map((part) => part.trim())
  const provinceLabel = parts[parts.length - 1]
  const districtLabel = parts.length > 1 ? parts[0] : ''
  const province = cambodiaAddressOptions.find((p) => p.label === provinceLabel)
  const district = province?.children?.find((d) => d.label === districtLabel)
  return { provinceCode: province?.value ?? '', districtCode: district?.value ?? '' }
}
