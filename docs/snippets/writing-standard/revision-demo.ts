export function buildRequestHeaders(token?: string) {
  return {
    'Content-Type': 'application/json', // [!code ++]
    Authorization: token ? `Bearer ${token}` : '', // [!code focus]
    'X-Debug-Mode': '1' // [!code --]
  }
}

submitForm() // [!code warning]
eval('unsafe') // [!code error]
