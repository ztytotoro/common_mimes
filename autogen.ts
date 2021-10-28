// get mime type and extension mapping from mdn
async function getRawData(): Promise<{
    [key: string]: string;
}[]> {
    const content = await fetch('https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types')

    // find table from html source
    const table = (await content.text()).match(/<table>(.*?)<\/table>/s)?.[1]

    if (table) {
        // convert table head to array
        const head = table.match(/<thead>(.*?)<\/thead>/s)![1]
        const tableHead = head.match(/<th>(.*?)<\/th>/gs)!.map((v: string) => v.match(/<th>(.*?)<\/th>/s)?.[1])
        // convert table to array of objects, use table head as keys
        const data = table.match(/<tr>(.*?)<\/tr>/gs)!.map(row => {
            const cells = row.match(/<td>(.*?)<\/td>/gs)?.map(cell => {
                return getTextFromHtml(cell)
            })
            return cells?.reduce((obj, cell, index) => {
                obj[tableHead[index]!] = cell
                return obj
            }, {} as { [key: string]: string })
        })

        return filterUndefined(data)
    }

    return []
}

function processData(data: {
    [key: string]: string;
}[]) {
    const mimeType = data.reduce((obj, row) => {
        getMimeTypes(row['MIME Type']).forEach(mime => {
            merge(obj, mime, row.Extension.split(' '))
        })
        return obj
    }, {} as { [key: string]: string[] })

    const extension = data.reduce((obj, row) => {
        row.Extension.split(' ').forEach(ext => {
            merge(obj, ext, getMimeTypes(row['MIME Type']))
        })
        return obj
    }, {} as { [key: string]: string[] })

    return { mimeType, extension }
}

function filterUndefined<T>(list: (T | undefined)[]): T[] {
    return list.filter(v => v !== undefined) as T[]
}

/**
 * This file is generated by gen_mime.ts automatically. please do not edit it manually.
 * @date 2020-06-06
 */
// write result to file use deno
async function writeFile(data: ReturnType<typeof processData>) {
    const mimeJson = JSON.stringify(data.mimeType, null, 2)
    const extJson = JSON.stringify(data.extension, null, 2)
    const content = text([
        '/**',
        ' * This file is generated by gen_mime.ts automatically. please do not edit it manually.',
        ` * @date ${new Date().toUTCString()}`,
        ' */',
        '',
        `export const MimeMapping: Record<string, string[]> = ${mimeJson}`,
        '',
        `export const ExtMapping: Record<string, string[]> = ${extJson}`
    ])
    await Deno.writeFile('./mod.ts', new TextEncoder().encode(content))
}

function text(lines: string[]) {
    return lines.join('\n')
}

function merge(obj: Record<string, string[]>, key: string, value: string[]) {
    if (obj[key]) {
        // concat and ensure unique
        obj[key] = [...new Set([...obj[key], ...value])]
    } else {
        obj[key] = value
    }
}

function getMimeTypes(cell: string): string[] {
    const str = cell.match(/^([a-zA-Z0-9-\.]+\/[a-zA-Z0-9-\.]+)( ([a-zA-Z0-9-\.]+\/[a-zA-Z0-9-\.]+)){0,1}/g)?.map(v => v.trim()) || ['']
    return str[0].split(' ')

}

function getTextFromHtml(html: string) {
    const text = html.replace(/<[^>]*>/g, '').trim()
    return text
}

writeFile(processData(await getRawData()))